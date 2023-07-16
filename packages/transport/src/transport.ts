import { Decoder, Encoder, HeaderPacket, IReadableStream, InvalidJsonException, MessageExecption, Packet, SendOpts, StreamAdapter, TransportSession, TransportSessionOpts } from '@tsdi/core';
import { isNil, isPromise, isString, promisify } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { ev, hdr } from './consts';
import { PacketLengthException } from './execptions';
import { isBuffer, toBuffer } from './utils';

export interface SendPacket extends HeaderPacket {
    size?: number;
    sendSize?: number;
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
    //     const packetSize = this.getPacketSize(packet);
    //     const maxSize = this.getPacketMaxSize();
    //     if(packetSize <= maxSize) {
    //         return this._write(chunk, packet, callback);
    //     } else {
    //         if (isNil(packet.remnantSize)) {
    //             packet.remnantSize = this.getPayloadLength(packet);
    //         }
    //     }

    //     const len = Buffer.byteLength(chunk);
    //     if (!packet.size) {
    //         packet.size = len;
    //     } else if (maxSize < packet.size + len) {
    //         packet.size += len;
    //     }
    // }

    // protected abstract getPacketSize(packet: SendPacket): number;
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
    protected async encodePayload(payload: any, packet: HeaderPacket): Promise<Buffer> {
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
            body = await this.encoder.encode(body);
            len = Buffer.byteLength(body);
            this.setPayloadLength(packet, len);
        }

        return body;
    }

    protected async pipeStream(payload: IReadableStream, packet: HeaderPacket, options?: SendOpts): Promise<void> {
        const buff = await this.generate(await toBuffer(payload), packet, options);
        return this.writeAsync(buff, packet);
    }

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

    async generateHeader(packet: HeaderPacket, options?: SendOpts): Promise<Buffer> {
        const { id, ...headers } = packet;
        const buffers = await this.serialize(headers);
        const bufId = Buffer.alloc(2);
        bufId.writeUInt16BE(packet.id);
        return Buffer.concat([
            Buffer.from(String(Buffer.byteLength(buffers) + 3)),
            this.delimiter,
            this._header,
            bufId,
            buffers
        ]);
    }

    protected async serialize(packet: HeaderPacket): Promise<Buffer> {
        let buff = Buffer.from(JSON.stringify(packet))
        if (this.encoder) {
            buff = await this.encoder.encode(buff);
        }
        if (this.options.zipHeader) {
            buff = await this.streamAdapter.gzip(buff)
        }
        return buff;
    }

    protected async deserialize(buff: Buffer): Promise<HeaderPacket> {
        if (this.options.zipHeader) {
            buff = await this.streamAdapter.gunzip(buff);
        }
        if (this.decoder) {
            buff = await this.decoder.decode(buff);
        }
        const str = buff.toString();
        try {
            return JSON.parse(str);
        } catch (err) {
            throw new InvalidJsonException(err, str);

        }
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

        const headerBuff = await this.generateHeader(packet, options);
        const payloadFlag = this.getPayloadPrefix(packet, options);
        const payloadBuf = await this.encodePayload(payload, packet);

        return Buffer.concat([
            headerBuff,
            payloadFlag,
            payloadBuf
        ]);

    }

    protected async generateNoPayload(packet: HeaderPacket): Promise<Buffer> {
        return this.generateHeader(packet)
    }
}

/**
 * Socket  transport session.
 */
export abstract class SocketTransportSession<T extends EventEmitter, TOpts extends TransportSessionOpts = TransportSessionOpts> extends BufferTransportSession<T, TOpts> {

    private buffers: Buffer[] = [];
    private length = 0
    private contentLength: number | null = null;
    private cachePkg: Map<number | string, Packet | Promise<Packet>> = new Map();

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


        this.buffers.push(data);
        this.length += data.length;

        if (this.contentLength == null) {
            const i = data.indexOf(this.delimiter);
            if (i !== -1) {
                const buffer = this.concatCaches();
                const idx = this.length - data.length + i;
                const rawContentLength = buffer.subarray(0, idx).toString();
                this.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(this.contentLength)) {
                    this.contentLength = null;
                    this.length = 0;
                    this.buffers = [];
                    throw new PacketLengthException(rawContentLength);
                }
                this.buffers = [buffer.subarray(idx + 1)];
            }
        }

        if (this.contentLength !== null) {
            if (this.length === this.contentLength) {
                this.handleMessage(this.concatCaches());
            } else if (this.length > this.contentLength) {
                const buffer = this.concatCaches();
                const message = buffer.subarray(0, this.contentLength);
                const rest = buffer.subarray(this.contentLength);
                this.handleMessage(message);
                this.handleData(rest);
            }
        }
    }

    protected concatCaches() {
        return this.buffers.length > 1 ? Buffer.concat(this.buffers) : this.buffers[0]
    }

    protected handleMessage(message: any) {
        this.contentLength = null;
        this.length = 0;
        this.buffers = [];
        this.emitMessage(message);
    }

    protected async emitMessage(chunk: Buffer) {
        if (chunk.indexOf(this._header) == 0) {
            const id = chunk.readUInt16BE(1);
            const msg$ = this.deserialize(chunk.subarray(3))
                .then((message: Packet) => {
                    message.id = id;
                    if (this.hasPayloadLength(message)) {
                        if (isNil(message.payload)) {
                            this.emit(ev.HEADERS, message);
                            this.cachePkg.set(id, message);
                        } else {
                            const len = this.getPayloadLength(message);
                            let plen;
                            if (isString(message) || isBuffer(message)) {
                                plen = Buffer.byteLength(message.payload);
                            } else {
                                plen = Buffer.byteLength(JSON.stringify(message.payload));
                            }
                            if (plen == len) {
                                this.emit(ev.MESSAGE, message);
                            }
                        }
                    } else {
                        this.emit(ev.MESSAGE, message);
                    }
                    return message;
                });
            this.cachePkg.set(id, msg$);
            await msg$

        } else if (chunk.indexOf(this._body) == 0) {
            const id = chunk.readUInt16BE(1);
            if (id) {
                let payload = chunk.subarray(3);
                let pkg = this.cachePkg.get(id);
                if (isPromise(pkg)) {
                    pkg = await pkg;
                }
                if (!pkg) throw new MessageExecption('No header found!');

                if (pkg.payload) {
                    payload = pkg.payload = Buffer.concat([pkg.payload, payload]);
                } else {
                    pkg.payload = payload;
                }


                const len = this.getPayloadLength(pkg);
                if (len && payload.length == len) {
                    this.cachePkg.delete(id);
                    if (this.decoder) {
                        pkg.payload = await this.decoder.decode(payload);
                    }
                    this.emit(ev.MESSAGE, pkg);
                } else if (!len) {
                    this.emit(ev.MESSAGE, pkg);
                }
            }

        }
    }

}


export interface TopicBuffer {
    topic: string;
    buffers: Buffer[];
    length: number;
    contentLength: number | null;
    pkgs: Map<number | string, Packet | Promise<Packet>>;
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
                    buffers: [],
                    length: 0,
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

        chl.buffers.push(data);
        chl.length += data.length;

        if (chl.contentLength == null) {
            const i = data.indexOf(this.delimiter);
            if (i !== -1) {
                const buffer = this.concatCaches(chl);
                const idx = chl.length - data.length + i;
                const rawContentLength = buffer.subarray(0, idx).toString();
                chl.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(chl.contentLength)) {
                    chl.contentLength = null;
                    chl.buffers = [];
                    chl.length = 0;
                    throw new PacketLengthException(rawContentLength);
                }
                chl.buffers = [buffer.subarray(idx + 1)];
            }
        }

        if (chl.contentLength !== null) {
            const length = chl.length;
            if (length === chl.contentLength) {
                this.handleMessage(chl, this.concatCaches(chl));
            } else if (length > chl.contentLength) {
                const buffer = this.concatCaches(chl);
                const message = buffer.subarray(0, chl.contentLength);
                const rest = buffer.subarray(chl.contentLength);
                this.handleMessage(chl, message);
                this.handleData(chl, rest);
            }
        }
    }

    protected concatCaches(chl: TopicBuffer) {
        return chl.buffers.length > 1 ? Buffer.concat(chl.buffers) : chl.buffers[0]
    }

    protected handleMessage(chl: TopicBuffer, message: any) {
        chl.contentLength = null;
        chl.length = 0;
        chl.buffers = [];
        this.emitMessage(chl, message);
    }

    protected async emitMessage(chl: TopicBuffer, data: Buffer) {
        if (data.indexOf(this._header) == 0) {
            const id = data.readUInt16BE(1);
            const msg$ = this.deserialize(data.subarray(3))
                .then((message: Packet) => {
                    message.id = id;
                    if (this.hasPayloadLength(message)) {
                        if (isNil(message.payload)) {
                            this.emit(ev.HEADERS, message);
                            chl.pkgs.set(id, message);
                        } else {
                            const len = this.getPayloadLength(message);
                            let plen;
                            if (isString(message) || isBuffer(message)) {
                                plen = Buffer.byteLength(message.payload);
                            } else {
                                plen = Buffer.byteLength(JSON.stringify(message.payload));
                            }
                            if (plen == len) {
                                this.emit(ev.MESSAGE, chl.topic, message);
                            }
                        }
                    } else {
                        this.emit(ev.MESSAGE, chl.topic, message);
                    }
                    return message;
                });
            chl.pkgs.set(id, msg$);
            await msg$;

        } else if (data.indexOf(this._body) == 0) {
            const id = data.readUInt16BE(1);
            if (id) {
                let payload = data.subarray(3);
                let pkg = chl.pkgs.get(id);
                if (isPromise(pkg)) {
                    pkg = await pkg;
                }
                if (!pkg) throw new MessageExecption('No header found!');

                if (pkg.payload) {
                    payload = pkg.payload = Buffer.concat([pkg.payload, payload]);
                } else {
                    pkg.payload = payload;
                }

                const len = this.getPayloadLength(pkg);
                if (len && payload.length == len) {
                    chl.pkgs.delete(id);
                    if (this.decoder) {
                        pkg.payload = await this.decoder.decode(payload);
                    }
                    this.emit(ev.MESSAGE, chl.topic, pkg);
                } else if (!len) {
                    this.emit(ev.MESSAGE, chl.topic, pkg);
                }
            }

        }
    }
}
