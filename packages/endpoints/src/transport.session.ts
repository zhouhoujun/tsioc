import { Execption, Injector, InvokeArguments } from '@tsdi/ioc';
import { PipeTransform, UuidGenerator } from '@tsdi/core';
import { AssetTransportOpts, Context, Decoder, Encoder, HeaderPacket, IEventEmitter, InvalidJsonException, Packet, PacketLengthException, RequestPacket, ResponsePacket, StreamAdapter, TransportOpts, TransportSession, ev, hdr } from '@tsdi/common';
import { Observable, Subscriber, defer, filter, finalize, first, fromEvent, lastValueFrom, map, merge, mergeMap, share, throwError, timeout } from 'rxjs';
import { NumberAllocator } from 'number-allocator';



export abstract class AbstractTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> implements TransportSession<TSocket> {

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly streamAdapter: StreamAdapter,
        readonly encoder: Encoder,
        readonly decoder: Decoder,
        readonly options: TransportOpts) {
    }


    getPacketStrategy(): string | undefined {
        return this.encoder.strategy ?? this.decoder.strategy
    }

    serialize(packet: Packet, withPayload?: boolean): Buffer {
        let pkg: Packet;
        if (withPayload) {
            const { length, ...data } = packet;
            pkg = data;
        } else {
            const { payload, ...headers } = packet;
            pkg = headers;
        }
        try {
            pkg = this.serialable(pkg);
            return Buffer.from(JSON.stringify(pkg))
        } catch (err) {
            throw new InvalidJsonException(err, String(pkg))
        }
    }

    protected serialable(packet: Packet): Packet {
        return packet
    }

    deserialize(raw: Buffer): Packet<any> {
        const jsonStr = new TextDecoder().decode(raw);
        try {
            return JSON.parse(jsonStr);
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr);
        }
    }


    send(packet: Packet): Observable<any> {
        const len = this.getPayloadLen(packet);
        if (len) {
            const opts = this.options as AssetTransportOpts;
            if (opts.payloadMaxSize && len > opts.payloadMaxSize) {
                const byfmt = this.injector.get<PipeTransform>('bytes-format');
                return throwError(() => new PacketLengthException(`Payload length ${byfmt.transform(len)} great than max size ${byfmt.transform(opts.payloadMaxSize)}`));
            }
        }

        return this.mergeClose(this.encode(packet)
            .pipe(
                mergeMap(data => {
                    const bufLen = data.length;
                    if (this.options.maxSize && bufLen > this.options.maxSize) {
                        const byfmt = this.injector.get<PipeTransform>('bytes-format');
                        return throwError(() => new PacketLengthException(`Packet length ${byfmt.transform(bufLen)} great than max size ${byfmt.transform(this.options.maxSize)}`));
                    }
                    return this.write(data, packet);
                })
            ))
    }

    request(packet: RequestPacket<any>): Observable<ResponsePacket<any>> {
        let obs$ = defer(() => this.requesting(packet)).pipe(
            mergeMap(r => this.receive(packet)),
            filter(p => this.responsePacketFilter(packet, p))
        );

        if (this.options.timeout) {
            obs$ = obs$.pipe(timeout(this.options.timeout))
        }
        return obs$;
    }

    receive(packet?: Packet): Observable<Packet> {
        return this.message(packet)
            .pipe(
                filter(msg => packet ? this.responseFilter(packet, msg) : true),
                mergeMap(msg => this.concat(msg).pipe(mergeMap(data => this.decode(data, msg)))),
                share()
            )
    }

    protected abstract concat(msg: TMsg): Observable<Buffer>;

    protected encode(packet: Packet): Observable<Buffer> {
        const ctx = this.createContext(packet);
        return this.encoder.handle(ctx)
            .pipe(
                map(buf => this.afterEncode(ctx, buf)),
                finalize(() => ctx.destroy())
            )
    }

    protected afterEncode(ctx: Context, buf: Buffer) {
        return buf;
    }

    protected decode(data: Buffer, msg: TMsg): Observable<Packet> {
        const ctx = this.createContext(data, msg);
        return this.decoder.handle(ctx)
            .pipe(
                map(pkg => this.afterDecode(ctx, pkg, msg)),
                finalize(() => ctx.destroy())
            );
    }

    protected afterDecode(ctx: Context, pkg: Packet, msg: TMsg) {
        return pkg;
    }

    abstract destroy(): Promise<void>;


    protected abstract message(packet?: Packet): Observable<TMsg>;

    protected abstract mergeClose(source: Observable<any>): Observable<any>;

    protected abstract write(data: Buffer, packet: Packet): Promise<void>;

    protected abstract beforeRequest(packet: RequestPacket<any>): Promise<void>;

    protected abstract createContext(msgOrPkg: Packet | string | Buffer | Uint8Array, msg?: TMsg, options?: InvokeArguments): Context;

    protected getPayloadLen(packet: Packet) {
        return packet.length ?? (~~(packet.headers?.[hdr.CONTENT_LENGTH] ?? '0'))
    }

    protected async requesting(packet: RequestPacket<any>): Promise<void> {
        this.bindPacketId(packet);
        await this.beforeRequest(packet);
        await lastValueFrom(this.send(packet))
    }

    protected responseFilter(req: RequestPacket, msg: TMsg) {
        return true;
    }

    protected responsePacketFilter(req: RequestPacket, res: ResponsePacket) {
        return res.id == req.id
    }

    protected bindPacketId(packet: RequestPacket<any>): void {
        if (!packet.id) {
            packet.id = this.getPacketId();
        }
    }

    protected abstract getPacketId(): string | number;

}

export interface TopicBuffer {
    topic: string;
    buffers: Buffer[];
    length: number;
    contentLength: number | null;
}

export abstract class BufferTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> extends AbstractTransportSession<TSocket, TMsg> implements TransportSession<TSocket> {

    protected topics: Map<string, TopicBuffer>;

    private delimiter: Buffer;
    private headDelimiter: Buffer;

    private allocator?: NumberAllocator;
    private last?: number;

    constructor(
        injector: Injector,
        socket: TSocket,
        streamAdapter: StreamAdapter,
        encoder: Encoder,
        decoder: Decoder,
        options: TransportOpts) {
        super(injector, socket, streamAdapter, encoder, decoder, options);
        this.delimiter = Buffer.from(options.delimiter ?? '#');
        this.headDelimiter = Buffer.from(options.headDelimiter ?? '$');
        this.topics = new Map();
    }


    protected override createContext(msgOrPkg: Packet | string | Buffer | Uint8Array, msg?: TMsg, options?: InvokeArguments) {
        return new Context(this.injector, this, msgOrPkg, msg ? this.getHeaders(msg) : undefined, this.delimiter, this.headDelimiter, options)
    }

    protected concat(msg: TMsg): Observable<Buffer> {
        return new Observable((subscriber: Subscriber<Buffer>) => {
            const topic = this.getTopic(msg);
            let chl = this.topics.get(topic);
            if (!chl) {
                chl = {
                    topic,
                    buffers: [],
                    length: 0,
                    contentLength: null
                }
                this.topics.set(topic, chl)
            }
            this.handleData(chl, this.getPayload(msg), subscriber);

            return subscriber;

        });

    }

    protected abstract getTopic(msg: TMsg): string;

    protected abstract getPayload(msg: TMsg): string | Buffer | Uint8Array;

    protected getHeaders(msg: TMsg): HeaderPacket | undefined {
        return undefined;
    }


    async destroy(): Promise<void> {
        this.topics.clear();
    }

    protected getPacketId(): string | number {
        if (!this.allocator) {
            this.allocator = new NumberAllocator(1, 65536)
        }
        const id = this.allocator.alloc();
        if (!id) {
            throw new Execption('alloc stream id failed');
        }
        this.last = id;
        return id;
    }

    protected abstract write(data: Buffer, packet: Packet): Promise<void>;

    protected handleData(chl: TopicBuffer, dataRaw: string | Buffer | Uint8Array, subscriber: Subscriber<Buffer>) {
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

                if (isNaN(chl.contentLength) || (this.options.maxSize && chl.contentLength > this.options.maxSize)) {
                    chl.contentLength = null;
                    chl.length = 0;
                    chl.buffers = [];
                    throw new PacketLengthException(rawContentLength);
                }
                chl.buffers = [buffer.subarray(idx + 1)];
                chl.length -= (idx + 1);
            }
        }

        if (chl.contentLength !== null) {
            if (chl.length === chl.contentLength) {
                this.handleMessage(chl, this.concatCaches(chl), subscriber);
                subscriber.complete();
            } else if (chl.length > chl.contentLength) {
                const buffer = this.concatCaches(chl);
                const message = buffer.subarray(0, chl.contentLength);
                const rest = buffer.subarray(chl.contentLength);
                this.handleMessage(chl, message, subscriber);
                if (rest.length) {
                    this.handleData(chl, rest, subscriber);
                }
            } else {
                subscriber.complete();
            }
        } else {
            subscriber.complete();
        }
    }

    protected concatCaches(chl: TopicBuffer) {
        return chl.buffers.length > 1 ? Buffer.concat(chl.buffers) : chl.buffers[0]
    }

    protected handleMessage(chl: TopicBuffer, message: Buffer, subscriber: Subscriber<Buffer>) {
        chl.contentLength = null;
        chl.length = 0;
        chl.buffers = [];
        subscriber.next(message);
    }

}


export abstract class EventTransportSession<TSocket extends IEventEmitter, TMsg = string | Buffer | Uint8Array> extends BufferTransportSession<TSocket, TMsg> {

    protected message(): Observable<TMsg> {
        return fromEvent(this.socket, ev.DATA) as Observable<TMsg>;
    }

    protected mergeClose(source: Observable<any>) {
        const close$ = fromEvent(this.socket, ev.CLOSE).pipe(
            map(err => {
                throw err
            }));
        const error$ = fromEvent(this.socket, ev.ERROR);
        return merge(source, error$, close$).pipe(first());
    }

}

export abstract class PayloadTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> extends AbstractTransportSession<TSocket, TMsg> {

    protected createContext(msgOrPkg: string | Packet<any> | Buffer | Uint8Array, msg?: TMsg | undefined, options?: InvokeArguments<any> | undefined): Context<Packet<any>> {
        return new Context(this.injector, this, msgOrPkg, msg ? this.getHeaders(msg) : undefined, undefined, undefined, options);
    }

    protected abstract getHeaders(msg: TMsg): HeaderPacket | undefined;


    private uuidGenner?: UuidGenerator;
    protected override getPacketId(): string {
        if (!this.uuidGenner) {
            this.uuidGenner = this.injector.get(UuidGenerator);
        }
        return this.uuidGenner.generate()
    }

}