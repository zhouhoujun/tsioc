import { Decoder, Encoder, InvalidJsonException, Packet, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Execption, Injectable, Optional, isString } from '@tsdi/ioc';
import { PacketLengthException, StreamAdapter, ev, hdr, isBuffer } from '@tsdi/transport';
import { Duplex } from 'stream';
import { NumberAllocator } from 'number-allocator';
import { EventEmitter } from 'events';

@Injectable()
export class TcpTransportSessionFactory<TSocket extends Duplex = any> implements TransportSessionFactory<TSocket> {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: TSocket, opts: TransportSessionOpts): TransportSession<TSocket> {
        return new TcpTransportSession(socket, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts.delimiter, opts.sizeDelimiter);
    }

}

export class TcpTransportSession<TSocket extends Duplex = any> extends EventEmitter implements TransportSession<TSocket> {

    allocator = new NumberAllocator(1, 65536);
    last?: number;
    private buffer: Buffer | null = null;
    private contentLength: number | null = null;

    private readonly delimiter: Buffer;
    private readonly sizeDelimiter: Buffer;

    private cachePkg: Map<number, Packet>;


    private _header: Buffer;
    private _body: Buffer;


    constructor(readonly socket: TSocket, private encoder: Encoder | undefined, private decoder: Decoder | undefined, delimiter = '\r\n', sizeDelimiter = '#') {
        super()
        this.delimiter = Buffer.from(delimiter);
        this.sizeDelimiter = Buffer.from(sizeDelimiter);
        this.cachePkg = new Map();
        this._header = Buffer.alloc(1, '0');
        this._body = Buffer.alloc(1, '1');
        
        socket.on(ev.DATA, this.onData.bind(this));
        socket.on(ev.MESSAGE, this.emit.bind(this, ev.MESSAGE));
        socket.on(ev.END, this.emit.bind(this, ev.END));
        socket.on(ev.ERROR, this.emit.bind(this, ev.ERROR));
        socket.on(ev.ABORTED, this.emit.bind(this, ev.ABORTED));
        socket.on(ev.CLOSE, this.emit.bind(this, ev.CLOSE));
        socket.on(ev.TIMEOUT, this.emit.bind(this, ev.TIMEOUT));
    }

    getStreamId() {
        const id = this.allocator.alloc();
        if (!id) {
            throw new Execption('alloc stream id failed');
        }
        this.last = id;
        return id;
    }


    async send(data: Packet): Promise<void> {
        const encoder = this.encoder;
        if (data.headers?.[hdr.CONTENT_LENGTH]) {
            const { payload, ...headers } = data;
            if (!headers.headers) {
                headers.headers = {};
            }
            const id = headers.id = headers.id ?? this.getStreamId();
            let len = isString(headers.headers[hdr.CONTENT_LENGTH]) ? ~~headers.headers[hdr.CONTENT_LENGTH] : headers.headers[hdr.CONTENT_LENGTH]!;

            let hmsg = JSON.stringify(headers);
            let body = payload;
            if (encoder) {
                hmsg = encoder.encode(hmsg);
                body = encoder.encode(payload);
                len = headers.headers[hdr.CONTENT_LENGTH] = Buffer.byteLength(body);
            }

            this.socket.write(String(hmsg.length + 1));
            this.socket.write(this.sizeDelimiter);
            this.socket.write(this._header);
            this.socket.write(hmsg);
            this.socket.write(String(len + 17));
            this.socket.write(this.sizeDelimiter);
            this.socket.write(this._body);
            this.socket.write(Buffer.alloc(16, id))
            this.socket.write(body);
            // this.socket.write(this.delimiter);

        } else {
            let msg = JSON.stringify(data);
            if (encoder) {
                msg = encoder.encode(msg);
            }
            const length = msg.length;
            this.socket.write(String(length + 1));
            this.socket.write(this.sizeDelimiter);
            this.socket.write(this._header);
            this.socket.write(msg);
            // this.socket.write(this.delimiter);
            // msg = length + this.sizeDelimiter + msg + this.delimiter;
            // this.socket.write(msg);
        }
    }

    destroy(error?: any): void {
        this.socket.end();
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
            const i = buffer.indexOf(this.sizeDelimiter);
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
            if (message.id && message.headers?.[hdr.CONTENT_LENGTH]) {
                this.cachePkg.set(message.id, message);
            } else {
                this.socket.emit(ev.MESSAGE, message);
            }
        } else if (data.indexOf(this._body) == 0) {
            const id = parseInt(data.slice(1, 17).toString(), 10);
            const pkg = this.cachePkg.get(id);
            if (pkg) {
                pkg.payload = data.slice(17);
                this.cachePkg.delete(id);
                this.socket.emit(ev.MESSAGE, pkg);
            }

        }
    }

}



