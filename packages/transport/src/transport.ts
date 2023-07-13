import { Decoder, Encoder, HeaderPacket, IReadableStream, InvalidJsonException, Packet, SendOpts, StreamAdapter, TransportSession, TransportSessionOpts } from '@tsdi/core';
import { isNil, isString, promisify } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { ev, hdr } from './consts';
import { PacketLengthException } from './execptions';

export interface SendPacket extends HeaderPacket {
    size?: number;
    remnantSize?: number;
    headersSent?: boolean;
}


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


    /**
     * send packet.
     * @param chunk 
     * @param packet
     * @param callback
     */
    abstract write(chunk: Buffer, packet: SendPacket, callback?: (err?: any) => void): void 

    // /**
    //  * send packet.
    //  * @param chunk 
    //  * @param packet
    //  * @param callback
    //  */
    // write(chunk: Buffer, packet: SendPacket, callback?: (err?: any) => void): void {
    //     if (isNil(packet.remnantSize)) {
    //         packet.remnantSize = this.getPayloadLength(packet);
    //     }
    //     const len = Buffer.byteLength(chunk);
    //     const maxSize = this.getPacketMaxSize();
    //     if (!packet.size) {
    //         packet.size = len;
    //     } else if (maxSize < packet.size + len) {
    //         packet.size += len;
    //     }
    // }

    // protected abstract getPacketMaxSize(): number;

    // /**
    //  * write socket.
    //  * @param chunk 
    //  * @param packet 
    //  * @param callback 
    //  */
    // protected abstract _write(chunk: Buffer, packet: HeaderPacket, callback?: (err?: any) => void): void;

    writeAsync(chunk: Buffer, packet: HeaderPacket): Promise<void> {
        return promisify(this.write, this)(chunk, packet);
    }

    async send(packet: Packet, options?: SendOpts): Promise<void> {
        const { payload, ...headers } = packet;
        if (!headers.headers) {
            headers.headers = {};
        }
        if (isNil(payload)) {
            const buffs = await this.generateNoPayload(headers, options);
            await this.writeAsync(buffs, packet);
        } else {
            if (this.streamAdapter.isReadable(payload)) {
                await this.pipeStream(payload, headers, options);
            } else {
                const buffs = await this.generate(payload, headers, options);
                await this.writeAsync(buffs, headers)
            }
        }
    }

    /**
     * encode packet.
     * @param payload 
     * @param packet 
     * @returns 
     */
    protected encodePayload(payload: any, packet: HeaderPacket): Buffer {
        let body: Buffer;
        if (isString(payload)) {
            body = Buffer.from(payload);
        } else if (Buffer.isBuffer(payload)) {
            body = payload;
        } else {
            body = Buffer.from(JSON.stringify(payload));
        }

        let len = Buffer.byteLength(body);
        if (!this.hasPayloadLength(packet)) {
            this.setPayloadLength(packet, len);
        }

        if (this.encoder) {
            body = this.encoder.encode(body);
            len = Buffer.byteLength(body);
            this.setPayloadLength(packet, len);
        }

        return body;
    }

    protected abstract pipeStream(payload: IReadableStream, packet: HeaderPacket, options?: SendOpts): Promise<void>;
    protected abstract generate(payload: any, packet: HeaderPacket, options?: SendOpts): Promise<Buffer>;
    protected abstract generateNoPayload(packet: HeaderPacket, options?: SendOpts): Promise<Buffer>;


    protected hasPayloadLength(packet: HeaderPacket) {
        return !isNil(packet.headers?.[hdr.CONTENT_LENGTH]);
    }

    protected getPayloadLength(packet: HeaderPacket): number {
        const headers = packet.headers;
        if (!headers) return 0;
        return isString(headers[hdr.CONTENT_LENGTH]) ? ~~headers[hdr.CONTENT_LENGTH] : headers[hdr.CONTENT_LENGTH]!
    }

    protected setPayloadLength(packet: HeaderPacket, len: number) {
        if (!packet.headers) {
            packet.headers = {};
        }
        packet.headers[hdr.CONTENT_LENGTH] = len;
    }

    destroy(error?: any): void {
        if (this._destroyed) return;
        this._destroyed = true;
        this._evs.forEach(it => {
            const [e, event] = it;
            this.offSocket(e, event);
        });
        this.removeAllListeners();
    }


    protected abstract handleFailed(error: any): void;


    protected bindEvent(options: TOpts) {
        this.getBindEvents().forEach(event => {
            const fn = (...args: any[]) => {
                this.emit(event, ...args);
                this.destroy();
            };
            this.onSocket(event, fn);
            this._evs.push([event, fn]);
        });
    }

    protected getBindEvents() {
        return [ev.END, ev.ERROR, ev.CLOSE, ev.ABOUT, ev.TIMEOUT]
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

    generateHeader(packet: HeaderPacket, options?: SendOpts): Buffer {
        let msg = JSON.stringify(packet);
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

    getPayloadPrefix(packet: HeaderPacket, options?: SendOpts): Buffer {
        const len = this.getPayloadLength(packet);
        const bufId = Buffer.alloc(2);
        bufId.writeUInt16BE(packet.id);

        return Buffer.concat([
            Buffer.from(String(len + 3)),
            this.delimiter,
            this._body,
            bufId
        ])

    }


    protected async generate(payload: any, packet: HeaderPacket, options?: SendOpts): Promise<Buffer> {

        const headerBuff = this.generateHeader(packet, options);
        const payloadFlag = this.getPayloadPrefix(packet, options);
        const payloadBuf = this.encodePayload(payload, packet);

        return Buffer.concat([
            headerBuff,
            payloadFlag,
            payloadBuf
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
                const rawContentLength = buffer.subarray(0, i).toString();
                this.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(this.contentLength)) {
                    this.contentLength = null;
                    this.buffer = null;
                    throw new PacketLengthException(rawContentLength);
                }
                this.buffer = buffer.subarray(i + 1);
            }
        }

        if (this.contentLength !== null) {
            const length = buffer.length;
            if (length === this.contentLength) {
                this.handleMessage(this.buffer);
            } else if (length > this.contentLength) {
                const message = this.buffer.subarray(0, this.contentLength);
                const rest = this.buffer.subarray(this.contentLength);
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
            const str = data.subarray(1).toString();
            try {
                message = JSON.parse(str);
            } catch (e) {
                throw new InvalidJsonException(e, str);
            }
            message = message || {};
            if (this.hasPayloadLength(message)) {
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
                const payload = data.subarray(3);
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
    pkgs: Map<number | string, Packet>;
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
                    pkgs: new Map()
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
                const rawContentLength = buffer.subarray(0, i).toString();
                chl.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(chl.contentLength)) {
                    chl.contentLength = null;
                    chl.buffer = null;
                    throw new PacketLengthException(rawContentLength);
                }
                chl.buffer = buffer.subarray(i + 1);
            }
        }

        if (chl.contentLength !== null) {
            const length = buffer.length;
            if (length === chl.contentLength) {
                this.handleMessage(chl, chl.buffer);
            } else if (length > chl.contentLength) {
                const message = chl.buffer.subarray(0, chl.contentLength);
                const rest = chl.buffer.subarray(chl.contentLength);
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
            const str = data.subarray(1).toString();
            try {
                message = JSON.parse(str);
            } catch (e) {
                throw new InvalidJsonException(e, str);
            }
            message = message || {};
            if (this.hasPayloadLength(message)) {
                if (isNil(message.payload)) {
                    this.emit(ev.HEADERS, message);
                    chl.pkgs.set(message.id, message);
                } else {
                    this.emit(ev.MESSAGE, chl.topic, message);
                }
            } else {
                this.emit(ev.MESSAGE, chl.topic, message);
            }
        } else if (data.indexOf(this._body) == 0) {
            const id = data.readUInt16BE(1);
            if (id) {
                const payload = data.subarray(3);
                let pkg = chl.pkgs.get(id);
                if (pkg) {
                    pkg.payload = payload;
                    chl.pkgs.delete(id);
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
