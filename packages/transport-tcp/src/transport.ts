import { Decoder, Encoder, InvalidJsonException, Packet, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Injectable, Optional, isNil, isString } from '@tsdi/ioc';
import { PacketLengthException, ev, hdr, toBuffer } from '@tsdi/transport';
import * as net from 'net';
import * as tls from 'tls';
import { Buffer } from 'buffer';
import { Readable } from 'stream';
import { EventEmitter } from 'events';

@Injectable()
export class TcpTransportSessionFactory implements TransportSessionFactory<tls.TLSSocket | net.Socket> {

    constructor(
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: tls.TLSSocket | net.Socket, opts: TransportSessionOpts): TransportSession<tls.TLSSocket | net.Socket> {
        return new TcpTransportSession(socket, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts.delimiter);
    }

}

export class TcpTransportSession extends EventEmitter implements TransportSession<tls.TLSSocket | net.Socket> {

    private buffer: Buffer | null = null;
    private contentLength: number | null = null;

    private readonly delimiter: Buffer;
    private cachePkg: Map<number, Packet>;

    private _header: Buffer;
    private _body: Buffer;
    private _evs: Array<[string, Function]>;


    constructor(readonly socket: tls.TLSSocket | net.Socket, private encoder: Encoder | undefined, private decoder: Decoder | undefined, delimiter = '#') {
        super()
        this.setMaxListeners(0);
        this.delimiter = Buffer.from(delimiter);
        this._header = Buffer.alloc(1, '0');
        this._body = Buffer.alloc(1, '1');
        this.cachePkg = new Map();

        this._evs = [ev.END, ev.ERROR, ev.CLOSE, ev.ABOUT, ev.TIMEOUT].map(e => [e, (...args: any[]) => {
            this.emit(e, ...args);
            this.destroy();
        }]);

        this._evs.push([ev.DATA, this.onData.bind(this)]);
        this._evs.forEach(it => {
            const [e, event] = it;
            socket.on(e, event as any);
        });
    }

    async send(data: Packet): Promise<void> {

        const encoder = this.encoder;

        if (!isNil(data.payload)) {
            const { payload, ...headers } = data;
            const id = data.id;
            if (!headers.headers) {
                headers.headers = {};
            }
            let len = isString(headers.headers[hdr.CONTENT_LENGTH]) ? ~~headers.headers[hdr.CONTENT_LENGTH] : headers.headers[hdr.CONTENT_LENGTH]!;

            let body: Buffer;
            if (isString(payload)) {
                body = Buffer.from(payload);
            } else if (Buffer.isBuffer(payload)) {
                body = payload;
            } else if (payload instanceof Readable) {
                body = await toBuffer(payload);
            } else {
                body = Buffer.from(JSON.stringify(payload));
            }

            if (!headers.headers[hdr.CONTENT_LENGTH]) {
                headers.headers[hdr.CONTENT_LENGTH] = Buffer.byteLength(body);
            }

            let hmsg = Buffer.from(JSON.stringify(headers));

            if (encoder) {
                hmsg = encoder.encode(hmsg);
                if (isString(hmsg)) hmsg = Buffer.from(hmsg);
                body = encoder.encode(body);
                if (isString(body)) body = Buffer.from(body);
                len = headers.headers[hdr.CONTENT_LENGTH] = Buffer.byteLength(body);
            }

            const bufId = Buffer.alloc(2);
            bufId.writeUInt16BE(id);

            this.socket.write(Buffer.concat([
                Buffer.from(String(Buffer.byteLength(hmsg) + 1)),
                this.delimiter,
                this._header,
                hmsg,
                Buffer.from(String(len + 3)),
                this.delimiter,
                this._body,
                bufId,
                body
            ]));

        } else {
            let msg = JSON.stringify(data);
            if (encoder) {
                msg = encoder.encode(msg);
            }
            const buffers = isString(msg) ? Buffer.from(msg) : msg;
            this.socket.write(Buffer.concat([
                Buffer.from(String(Buffer.byteLength(buffers) + 1)),
                this.delimiter,
                this._header,
                buffers
            ]));
        }
    }

    destroy(error?: any): void {
        this._evs.forEach(it => {
            const [e, event] = it;
            this.socket.off(e, event as any);
        });
        this.removeAllListeners();
    }

    onData(chunk: any) {
        try {
            this.handleData(chunk);
        } catch (ev) {
            const e = ev as any;
            this.socket.emit(e.ERROR, e.message);
            this.socket.end();
        }
    }


    handleData(dataRaw: string | Buffer) {
        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);
        const buffer = this.buffer = this.buffer ? Buffer.concat([this.buffer, data], this.buffer.length + data.length) : Buffer.from(data);

        if (this.contentLength == null) {
            const i = buffer.indexOf(this.delimiter);
            if (i !== -1) {
                const rawContentLength = buffer.slice(0, i).toString();
                this.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(this.contentLength)) {
                    this.contentLength = null;
                    this.buffer = null;
                    throw new PacketLengthException(rawContentLength);
                }
                this.buffer = buffer.slice(i + 1);
            }
        }

        if (this.contentLength !== null) {
            const length = buffer.length;
            if (length === this.contentLength) {
                this.handleMessage(this.buffer);
            } else if (length > this.contentLength) {
                const message = this.buffer.slice(0, this.contentLength);
                const rest = this.buffer.slice(this.contentLength);
                this.handleMessage(message);
                this.handleData(rest);
            }
        }
    }

    private handleMessage(message: any) {
        this.contentLength = null;
        this.buffer = null;
        this.emitMessage(message);
    }

    protected emitMessage(chunk: Buffer) {
        const data = this.decoder ? this.decoder.decode(chunk) as Buffer : chunk;
        if (data.indexOf(this._header) == 0) {
            let message: Packet;
            const str = data.slice(1).toString();
            try {
                message = JSON.parse(str);
            } catch (e) {
                throw new InvalidJsonException(e, str);
            }
            message = message || {};
            if (message.headers?.[hdr.CONTENT_LENGTH]) {
                if (isNil(message.payload)) {
                    this.socket.emit(ev.HEADERS, message);
                    this.cachePkg.set(message.id, message);
                } else {
                    this.emit(ev.MESSAGE, message);
                }
            } else {
                this.emit(ev.MESSAGE, message);
            }
        } else if (data.indexOf(this._body) == 0) {
            const id = data.readUInt16BE(1);
            if (id) {
                const payload = data.slice(3);
                let pkg = this.cachePkg.get(id);
                if (pkg) {
                    pkg.payload = payload;
                    this.cachePkg.delete(id);
                } else {
                    pkg = {
                        id,
                        payload
                    }
                }
                this.emit(ev.MESSAGE, pkg);
            }

        }
    }

}



