import { Decoder, Encoder, InvalidJsonException, Packet, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Injectable, Optional, isNil, isString } from '@tsdi/ioc';
import { PacketLengthException, ev, hdr, toBuffer } from '@tsdi/transport';
import Redis, { RedisOptions } from 'ioredis';
import { Buffer } from 'buffer';
import { Readable } from 'stream';
import { EventEmitter } from 'events';


export interface ReidsStream {
    publisher: Redis;
    subscriber: Redis;
}

@Injectable()
export class RedisTransportSessionFactory implements TransportSessionFactory<ReidsStream> {

    constructor(
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: ReidsStream, opts: TransportSessionOpts): TransportSession<ReidsStream> {
        return new RedisTransportSession(socket, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts.delimiter, opts.serverSide);
    }

}

export interface ChannelBuffer {
    channel: string;
    buffer: Buffer | null;
    contentLength: number | null;
    cachePkg: Map<number, Packet>;
}


export class RedisTransportSession extends EventEmitter implements TransportSession<ReidsStream> {

    private readonly delimiter: Buffer;

    private channels: Map<string, ChannelBuffer>;

    private _header: Buffer;
    private _body: Buffer;
    private _evs: Array<[string, Function]>;


    constructor(readonly socket: ReidsStream, private encoder: Encoder | undefined, private decoder: Decoder | undefined, delimiter = '#', private serverSide = false) {
        super()
        this.setMaxListeners(0);
        this.delimiter = Buffer.from(delimiter);
        this._header = Buffer.alloc(1, '0');
        this._body = Buffer.alloc(1, '1');
        this.channels = new Map();

        this._evs = [ev.END, ev.ERROR, ev.CLOSE, ev.ABOUT, ev.TIMEOUT].map(e => [e, (...args: any[]) => {
            this.emit(e, ...args);
            this.destroy();
        }]);

        this._evs.forEach(it => {
            const [e, event] = it;
            socket.publisher.on(e, event as any);
            socket.subscriber.on(e, event as any);
        });

        const e = ev.MESSAGE_BUFFER;
        const event = this.onData.bind(this);
        socket.subscriber.on(e, event);
        this._evs.push([e, event]);

        const pe = 'pmessageBuffer';
        const pevent = (pattern: string, topic: string | Buffer, chunk: string | Buffer) => {
            const channel = isString(topic) ? topic : topic.toString();
            if (this.serverSide && channel.endsWith('.reply')) return;
            this.onData(channel, chunk);
        }
        socket.subscriber.on(pe, pevent);
        this._evs.push([pe, pevent]);
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

            this.socket.publisher.publish(data.url!, Buffer.concat([
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
            this.socket.publisher.publish(data.url!, Buffer.concat([
                Buffer.from(String(Buffer.byteLength(buffers) + 1)),
                this.delimiter,
                this._header,
                buffers
            ]))
        }
    }

    destroy(error?: any): void {
        this._evs.forEach(it => {
            const [e, event] = it;
            this.socket.publisher.off(e, event as any);
            this.socket.subscriber.off(e, event as any);
        });
        this.removeAllListeners();
    }

    onData(topic: string | Buffer, chunk: string | Buffer) {
        const channel = isString(topic) ? topic : topic.toString();
        try {
            let chl = this.channels.get(channel);
            if (!chl) {
                chl = {
                    channel,
                    buffer: null,
                    contentLength: null,
                    cachePkg: new Map()
                }
                this.channels.set(channel, chl)
            }
            this.handleData(chl, chunk);
        } catch (ev) {
            const e = ev as any;
            this.emit(e.ERROR, e.message);
        }
    }


    handleData(chl: ChannelBuffer, dataRaw: string | Buffer) {

        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);
        const buffer = chl.buffer = chl.buffer ? Buffer.concat([chl.buffer, data], chl.buffer.length + data.length) : Buffer.from(data);

        if (chl.contentLength == null) {
            const i = buffer.indexOf(this.delimiter);
            if (i !== -1) {
                const rawContentLength = buffer.slice(0, i).toString();
                chl.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(chl.contentLength)) {
                    chl.contentLength = null;
                    chl.buffer = null;
                    throw new PacketLengthException(rawContentLength);
                }
                chl.buffer = buffer.slice(i + 1);
            }
        }

        if (chl.contentLength !== null) {
            const length = buffer.length;
            if (length === chl.contentLength) {
                this.handleMessage(chl, chl.buffer);
            } else if (length > chl.contentLength) {
                const message = chl.buffer.slice(0, chl.contentLength);
                const rest = chl.buffer.slice(chl.contentLength);
                this.handleMessage(chl, message);
                this.handleData(chl, rest);
            }
        }
    }

    private handleMessage(chl: ChannelBuffer, message: any) {
        chl.contentLength = null;
        chl.buffer = null;
        this.emitMessage(chl, message);
    }

    protected emitMessage(chl: ChannelBuffer, chunk: Buffer) {
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
                    this.emit(ev.HEADERS, message);
                    chl.cachePkg.set(message.id, message);
                } else {
                    this.emit(ev.MESSAGE, chl.channel, message);
                }
            } else {
                this.emit(ev.MESSAGE, chl.channel, message);
            }
        } else if (data.indexOf(this._body) == 0) {
            const id = data.readUInt16BE(1);
            if (id) {
                const payload = data.slice(3);
                let pkg = chl.cachePkg.get(id);
                if (pkg) {
                    pkg.payload = payload;
                    chl.cachePkg.delete(id);
                } else {
                    pkg = {
                        id,
                        payload
                    }
                }
                this.emit(ev.MESSAGE, chl.channel, pkg);
            }

        }
    }

}
