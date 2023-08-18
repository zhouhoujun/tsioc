import { HeaderPacket, IncomingHeaders, Packet, InvalidJsonException, MessageExecption, PacketLengthException } from '@tsdi/common';
import { EMPTY, isNil, isString, promisify } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { ev, hdr } from '../consts';
import { isBuffer } from '../utils';
import { StreamAdapter } from '../StreamAdapter';
import { CodingOption, Decoder, Encoder, Subpackage } from '../coding';
import { SendOpts, SendPacket, TransportSession, TransportSessionOpts } from '../TransportSession';
import { IReadableStream } from '../stream';


/**
 * abstract transport session.
 */
export abstract class AbstractTransportSession<T, TOpts> extends EventEmitter implements TransportSession<T> {

    protected _evs: Array<[string, (...args: any[]) => void]>;
    private _destroyed = false;
    constructor(
        readonly socket: T,
        protected streamAdapter: StreamAdapter,
        protected encoder: Encoder,
        protected decoder: Decoder,
        protected options: TOpts,
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
    abstract write(packet: SendPacket, chunk: Buffer | null, callback?: (err?: any) => void): void;

    writeAsync(packet: SendPacket, chunk: Buffer | null): Promise<void> {
        return promisify(this.write, this)(packet, chunk);
    }

    async send(packet: Packet, options?: SendOpts): Promise<void> {
        const { payload, ...headers } = packet;
        if (!headers.headers) {
            headers.headers = {};
        }
        const pkg = { packet };
        if (isNil(payload)) {
            await this.writeAsync(pkg, null);
        } else {
            if (this.streamAdapter.isReadable(payload)) {
                await this.pipeStream(payload, pkg, options);
            } else {
                const buffs = this.generatePayload(payload, pkg);
                await this.writeAsync(pkg, buffs)
            }
        }
    }

    /**
     * encode packet.
     * @param payload 
     * @param packet 
     * @returns 
     */
    protected generatePayload(payload: any, packet: SendPacket): Buffer {
        let body: Buffer;
        if (isString(payload)) {
            body = Buffer.from(payload);
        } else if (Buffer.isBuffer(payload)) {
            body = payload;
        } else {
            body = Buffer.from(JSON.stringify(payload));
        }

        if (!this.hasPayloadLength(packet.packet)) {
            this.setPayloadLength(packet.packet, Buffer.byteLength(body));
        }

        return body;
    }

    protected async pipeStream(payload: IReadableStream, packet: SendPacket, options?: SendOpts): Promise<void> {
        await this.streamAdapter.pipeTo(payload, this.streamAdapter.createWritable({
            write: (chunk, encoding, callback) => {
                this.write(packet, chunk, callback);
            }
        }));
    }

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


    protected handleFailed(error: any): void {
        this.emit(ev.ERROR, error)
    }

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


export abstract class CustomTransportSession<T, TOpts extends TransportSessionOpts = TransportSessionOpts> extends AbstractTransportSession<T, TOpts> {

    /**
     * send packet.
     * @param chunk 
     * @param subpkg
     * @param callback
     */
    write(subpkg: Subpackage, chunk: Buffer | null, callback?: (err?: any) => void): void {
        try {
            const [data, rest] = this.serialize(subpkg, chunk, this.options);
            if (data) {
                this.sending(subpkg.packet, data, (err) => {
                    if (err) return callback?.(err);
                    if (rest && rest.length) {
                        this.write(subpkg, rest, callback)
                    }
                })
            } else {
                callback?.();
            }
        } catch (err) {
            callback?.(err);
        }
    }

    abstract sending(packet: Packet, data: Buffer, callback?: (err?: any) => void): void;

    protected serialize(packet: Subpackage, chunk: Buffer | null, options: CodingOption) {
        return this.encoder.encode(packet, chunk, options);
    }

    protected deserialize(dataRaw: string | Buffer, options: CodingOption) {
        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);

        try {
            const pkg = this.decoder.decode(data, options);
            if (pkg) {
                this.emit(ev.MESSAGE, pkg);
            }
        } catch (err) {
            this.emit(ev.ERROR, err);
        }
    }
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

    generateHeader(packet: Subpackage, options?: SendOpts): Buffer {
        const { id, payload, ...headers } = packet.packet;
        const buffers = this.serialize(headers);
        const bufId = Buffer.alloc(2);
        bufId.writeUInt16BE(id);
        const len = Buffer.byteLength(buffers);
        packet.headerSize = len;
        packet.payloadSize = this.getPayloadLength(packet.packet);
        packet.size = packet.headerSize + packet.payloadSize;
        return Buffer.concat([
            Buffer.from(String(len + 3)),
            this.delimiter,
            this._header,
            bufId,
            buffers
        ]);
    }

    protected serialize(packet: HeaderPacket): Buffer {
        return Buffer.from(JSON.stringify(packet));
    }

    protected deserialize(buff: Buffer): Packet {
        const str = buff.toString();
        try {
            return JSON.parse(str);
        } catch (err) {
            throw new InvalidJsonException(err, str);

        }
    }


    getPayloadPrefix(packet: HeaderPacket, size: number, options?: SendOpts): Buffer {
        const bufId = Buffer.alloc(2);
        bufId.writeUInt16BE(packet.id);
        return Buffer.concat([
            Buffer.from(String(size + 3)),
            this.delimiter,
            this._body,
            bufId
        ])
    }

    getSendBuffer(subpkg: Subpackage, size: number) {
        let data: Buffer[];
        if (subpkg.headCached) {
            subpkg.headCached = false;
            const prefix = this.getPayloadPrefix(subpkg.packet, size - Buffer.byteLength(subpkg.caches[0]));
            data = [subpkg.caches[0], prefix, ...subpkg.caches.slice(1)];
        } else {
            const prefix = this.getPayloadPrefix(subpkg.packet, size);
            data = [prefix, ...subpkg.caches];
        }
        subpkg.caches = [];
        subpkg.cacheSize = 0;
        return Buffer.concat(data);
    }

}

/**
 * Socket  transport session.
 */
export abstract class SocketTransportSession<T extends EventEmitter, TOpts extends TransportSessionOpts = TransportSessionOpts> extends BufferTransportSession<T, TOpts> {

    private buffers: Buffer[] = [];
    private length = 0
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


        this.buffers.push(data);
        this.length += Buffer.byteLength(data);

        if (this.contentLength == null) {
            const i = data.indexOf(this.delimiter);
            if (i !== -1) {
                const buffer = this.concatCaches();
                const idx = this.length - Buffer.byteLength(data) + i;
                const rawContentLength = buffer.subarray(0, idx).toString();
                this.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(this.contentLength)) {
                    this.contentLength = null;
                    this.length = 0;
                    this.buffers = [];
                    throw new PacketLengthException(rawContentLength);
                }
                this.buffers = [buffer.subarray(idx + 1)];
                this.length -= idx + 1;
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
                if (rest.length) {
                    this.handleData(rest);
                }
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
        return this.emitMessage(message);
    }

    protected emitMessage(chunk: Buffer) {
        // this.deserialize(chunk);
        if (chunk.indexOf(this._header) == 0) {
            const id = chunk.readUInt16BE(1);
            const message = this.deserialize(chunk.subarray(3))

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

        } else if (chunk.indexOf(this._body) == 0) {
            const id = chunk.readUInt16BE(1);
            if (id) {
                let payload = chunk.subarray(3);
                const pkg = this.cachePkg.get(id);

                if (!pkg) throw new MessageExecption('No header found!');

                if (pkg.payload) {
                    payload = pkg.payload = Buffer.concat([pkg.payload, payload]);
                } else {
                    pkg.payload = payload;
                }

                const len = this.getPayloadLength(pkg);
                if (len && payload.length == len) {
                    this.cachePkg.delete(id);
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
        chl.length += Buffer.byteLength(data);

        if (chl.contentLength == null) {
            const i = data.indexOf(this.delimiter);
            if (i !== -1) {
                const buffer = this.concatCaches(chl);
                const idx = chl.length - Buffer.byteLength(data) + i;
                const rawContentLength = buffer.subarray(0, idx).toString();
                chl.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(chl.contentLength)) {
                    chl.contentLength = null;
                    chl.buffers = [];
                    chl.length = 0;
                    throw new PacketLengthException(rawContentLength);
                }
                chl.buffers = [buffer.subarray(idx + 1)];
                chl.length -= idx + 1;
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
                if (rest.length) this.handleData(chl, rest);
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
        return this.emitMessage(chl, message);
    }

    protected emitMessage(chl: TopicBuffer, data: Buffer) {
        if (data.indexOf(this._header) == 0) {
            const id = data.readUInt16BE(1);
            const message = this.deserialize(data.subarray(3))
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

        } else if (data.indexOf(this._body) == 0) {
            const id = data.readUInt16BE(1);
            if (id) {
                let payload = data.subarray(3);
                const pkg = chl.pkgs.get(id);
                if (!pkg) throw new MessageExecption('No header found!');

                if (pkg.payload) {
                    payload = pkg.payload = Buffer.concat([pkg.payload, payload]);
                } else {
                    pkg.payload = payload;
                }

                const len = this.getPayloadLength(pkg);
                if (len && payload.length == len) {
                    chl.pkgs.delete(id);
                    this.emit(ev.MESSAGE, chl.topic, pkg);
                } else if (!len) {
                    this.emit(ev.MESSAGE, chl.topic, pkg);
                }
            }

        }
    }
}


/**
 * custom message transport session.
 */
export abstract class MessageTransportSession<T, TMsg, TOpts> extends AbstractTransportSession<T, TOpts> {

    protected topics: Map<string, TopicBuffer> = new Map();

    protected onData(msg: TMsg, topic: string, error?: any): void {
        try {
            let chl = this.topics.get(topic);
            if (!chl) {
                chl = this.createTopicBuffer(msg, topic);
                this.topics.set(topic, chl);
            } else if (chl.contentLength === null) {
                chl.buffers = [];
                chl.contentLength = this.getIncomingContentLength(msg);
            }
            const id = this.getIncomingPacketId(msg);
            if (!chl.pkgs.has(id)) {
                const headers = this.getIncomingHeaders(msg);
                if (!headers[hdr.CONTENT_TYPE]) {
                    headers[hdr.CONTENT_TYPE] = this.getIncomingContentType(msg);
                }
                if (!headers[hdr.CONTENT_ENCODING]) {
                    headers[hdr.CONTENT_ENCODING] = this.getIncomingContentEncoding(msg);
                }
                chl.pkgs.set(id, this.createPackage(id, topic, this.getIncomingReplyTo(msg), headers, msg, error))
            }
            this.handleData(chl, id, this.getIncomingPayload(msg));
        } catch (ev) {
            const e = ev as any;
            this.emit(e.ERROR, e.message);
        }

    }

    protected handleData(chl: TopicBuffer, id: string | number, dataRaw: string | Buffer | Uint8Array) {

        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);


        chl.buffers.push(data);
        chl.length += data.length;

        if (chl.contentLength !== null) {
            const buffer = this.concatCaches(chl);
            const length = buffer.length;
            if (length === chl.contentLength) {
                this.handleMessage(chl, id, buffer);
            } else if (length > chl.contentLength) {
                const buffer = this.concatCaches(chl);
                const message = buffer.subarray(0, chl.contentLength);
                const rest = buffer.subarray(chl.contentLength);
                this.handleMessage(chl, id, message);
                if (rest.length) {
                    this.handleData(chl, id, rest);
                }
            }
        }
    }

    protected concatCaches(chl: TopicBuffer) {
        return chl.buffers.length > 1 ? Buffer.concat(chl.buffers) : chl.buffers[0]
    }

    protected handleMessage(chl: TopicBuffer, id: string | number, message: any) {
        chl.contentLength = null;
        chl.buffers = [];
        chl.length = 0;
        return this.emitMessage(chl, id, message);
    }

    protected emitMessage(chl: TopicBuffer, id: string | number, data: Buffer) {
        const pkg = chl.pkgs.get(id) as Packet;
        if (pkg) {
            let payload = data;
            if (pkg.payload) {
                if (data.length) {
                    payload = pkg.payload = Buffer.concat([pkg.payload, data]);
                }
            } else {
                pkg.payload = data.length ? data : null;
            }

            const len = this.getPayloadLength(pkg);
            if (len && payload.length == len) {
                chl.pkgs.delete(id);
                this.emit(ev.MESSAGE, chl.topic, pkg);
            } else if (!len) {
                this.emit(ev.MESSAGE, chl.topic, pkg);
            }
        }
    }

    protected abstract createPackage(id: string | number, topic: string, replyTo: string, headers: IncomingHeaders, msg: TMsg, error?: any): HeaderPacket;
    protected abstract getIncomingHeaders(msg: TMsg): IncomingHeaders;
    protected abstract getIncomingPacketId(msg: TMsg): number | string;
    protected abstract getIncomingReplyTo(msg: TMsg): string;
    protected abstract getIncomingContentType(msg: TMsg): string | undefined;
    protected abstract getIncomingContentEncoding(msg: TMsg): string | undefined;
    protected abstract getIncomingContentLength(msg: TMsg): number;
    protected abstract getIncomingPayload(msg: TMsg): string | Buffer | Uint8Array;

    protected createTopicBuffer(msg: TMsg, topic: string): TopicBuffer {
        return {
            topic,
            buffers: [],
            length: 0,
            contentLength: this.getIncomingContentLength(msg),
            pkgs: new Map()
        }
    }

    protected getSendBuffer(packet: Subpackage, size: number) {
        const data = Buffer.concat(packet.caches);
        packet.caches = [];
        packet.cacheSize = 0;
        return data;
    }

}
