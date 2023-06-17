import { Decoder, Encoder, InvalidJsonException, Packet, StreamAdapter, TransportSession, TransportSessionOpts } from '@tsdi/core';
import { isNil, isString } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { ev, hdr } from './consts';
import { toBuffer } from './utils';
import { PacketLengthException } from './execptions';

/**
 * abstract transport session.
 */
export abstract class AbstractTransportSession<T, TOpts> extends EventEmitter implements TransportSession<T> {

    protected _evs: Array<[string, (...args: any[]) => void]>;
    private _destroyed = false;
    constructor(
        readonly socket: T,
        protected streamAdapter: StreamAdapter,
        protected encoder: Encoder | undefined,
        protected decoder: Decoder | undefined,
        protected options: TOpts
    ) {
        super()
        this.setMaxListeners(0);
        this._evs = [];
        this.init(options);
        this.bindEvent(options);
        this.bindMessageEvent(options);
    }

    protected init(options: TOpts) {

    }

    async send(data: Packet): Promise<void> {
        const buffers = await (isNil(data.payload) ? this.generateNoPayload(data) : this.generate(data));
        this.writeBuffer(buffers, data);
    }

    protected abstract generate(data: Packet): Promise<Buffer>;
    protected abstract generateNoPayload(data: Packet): Promise<Buffer>;


    destroy(error?: any): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this._evs.forEach(it => {
            const [e, event] = it;
            this.offSocket(e, event);
        });
        this.removeAllListeners();
    }

    protected abstract writeBuffer(buffer: Buffer, packet?: Packet): any;

    protected abstract handleFailed(error: any): void;


    protected bindEvent(options: TOpts) {
        [ev.END, ev.ERROR, ev.CLOSE, ev.ABOUT, ev.TIMEOUT].forEach(event => {
            const fn = (...args: any[]) => {
                this.emit(event, ...args);
                this.destroy();
            };
            this.onSocket(event, fn);
            this._evs.push([event, fn]);
        });
    }

    protected bindMessageEvent(options: TOpts) {
        const fn = this.onData.bind(this);
        this.onSocket(ev.DATA, fn);
        this._evs.push([ev.DATA, fn]);
    }

    protected abstract onSocket(name: string, event: (...args: any[]) => void): void;
    protected abstract offSocket(name: string, event: (...args: any[]) => void): void;

    protected abstract onData(...args: any[]): void;


}

export abstract class BufferTransportSession<T, TOpts extends TransportSessionOpts = TransportSessionOpts> extends AbstractTransportSession<T, TOpts> {

    protected delimiter!: Buffer;
    protected _header!: Buffer;
    protected _body!: Buffer;

    protected init(options: TOpts): void {

        this.delimiter = Buffer.from(options.delimiter || '#');
        this._header = Buffer.alloc(1, '0');
        this._body = Buffer.alloc(1, '1');
    }


    protected async generate(data: Packet): Promise<Buffer> {
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
        } else if (this.streamAdapter.isReadable(payload)) {
            body = await toBuffer(payload);
        } else {
            body = Buffer.from(JSON.stringify(payload));
        }

        if (!headers.headers[hdr.CONTENT_LENGTH]) {
            headers.headers[hdr.CONTENT_LENGTH] = Buffer.byteLength(body);
        }

        let hmsg = Buffer.from(JSON.stringify(headers));

        if (this.encoder) {
            hmsg = this.encoder.encode(hmsg);
            if (isString(hmsg)) hmsg = Buffer.from(hmsg);
            body = this.encoder.encode(body);
            if (isString(body)) body = Buffer.from(body);
            len = headers.headers[hdr.CONTENT_LENGTH] = Buffer.byteLength(body);
        }

        const bufId = Buffer.alloc(2);
        bufId.writeUInt16BE(id);

        return Buffer.concat([
            Buffer.from(String(Buffer.byteLength(hmsg) + 1)),
            this.delimiter,
            this._header,
            hmsg,
            Buffer.from(String(len + 3)),
            this.delimiter,
            this._body,
            bufId,
            body
        ]);

    }

    protected async generateNoPayload(data: Packet): Promise<Buffer> {
        let msg = JSON.stringify(data);
        if (this.encoder) {
            msg = this.encoder.encode(msg);
        }
        const buffers = isString(msg) ? Buffer.from(msg) : msg;
        return Buffer.concat([
            Buffer.from(String(Buffer.byteLength(buffers) + 1)),
            this.delimiter,
            this._header,
            buffers
        ]);
    }
}

/**
 * Socket  transport session.
 */
export abstract class SocketTransportSession<T extends EventEmitter, TOpts extends TransportSessionOpts = TransportSessionOpts> extends BufferTransportSession<T, TOpts> {

    private buffer: Buffer | null = null;
    private contentLength: number | null = null;
    private cachePkg: Map<number | string, Packet> = new Map();

    protected onSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.on(name, event);
    }
    protected offSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.off(name, event);
    }

    protected override onData(chunk: any) {
        try {
            this.handleData(chunk);
        } catch (ev) {
            this.handleFailed(ev as any);
        }
    }

    protected handleData(dataRaw: string | Buffer) {
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

    protected handleMessage(message: any) {
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


export interface TopicBuffer {
    topic: string;
    buffer: Buffer | null;
    contentLength: number | null;
    cachePkg: Map<number, Packet>;
}

/**
 * topic transport session
 */
export abstract class TopicTransportSession<T, TOpts extends TransportSessionOpts = TransportSessionOpts> extends BufferTransportSession<T, TOpts>  {

    protected topics: Map<string, TopicBuffer> = new Map();


    protected override bindMessageEvent(options: TOpts): void {
        const pe = ev.MESSAGE;
        const pevent = (topic: string, chunk: Buffer) => {
            if (this.options.serverSide && topic.endsWith('/reply')) return;
            this.onData(topic, chunk);
        }
        this.onSocket(pe, pevent);
        this._evs.push([pe, pevent]);
    }

    protected onData(topic: string, chunk: any) {
        try {
            let chl = this.topics.get(topic);
            if (!chl) {
                chl = {
                    topic,
                    buffer: null,
                    contentLength: null,
                    cachePkg: new Map()
                }
                this.topics.set(topic, chl)
            }
            this.handleData(chl, chunk);
        } catch (ev) {
            const e = ev as any;
            this.emit(e.ERROR, e.message);
        }
    }

    protected handleData(chl: TopicBuffer, dataRaw: string | Buffer) {

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

    protected handleMessage(chl: TopicBuffer, message: any) {
        chl.contentLength = null;
        chl.buffer = null;
        this.emitMessage(chl, message);
    }

    protected emitMessage(chl: TopicBuffer, chunk: Buffer) {
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
                    this.emit(ev.MESSAGE, chl.topic, message);
                }
            } else {
                this.emit(ev.MESSAGE, chl.topic, message);
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
                this.emit(ev.MESSAGE, chl.topic, pkg);
            }

        }
    }
}
