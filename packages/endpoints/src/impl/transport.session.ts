import { Execption, Injector, isNil } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import {
    AssetTransportOpts, Decoder, Encoder, HeaderPacket, IEventEmitter, IReadableStream, OutgoingType, Packet, PacketLengthException,
    StreamAdapter, TransportOpts, TransportSession, ev
} from '@tsdi/common';
import { Observable, Subscriber, first, fromEvent, map, merge, mergeMap, share, throwError } from 'rxjs';
import { NumberAllocator } from 'number-allocator';
import { IncomingContext, ServerTransportSession } from '../transport/session';
import { IncomingDecoder, OutgoingEncoder } from '../transport/codings';
import { TransportContext } from '../TransportContext';
import { ServerOpts } from '../Server';



export abstract class AbstractServerTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> extends ServerTransportSession<TSocket> {

    abstract get encoder(): OutgoingEncoder;

    abstract get decoder(): IncomingDecoder;

    send(ctx: TransportContext): Observable<any> {
        const len = ctx.length;
        if (len) {
            const opts = this.options as AssetTransportOpts;
            if (opts.payloadMaxSize && len > opts.payloadMaxSize) {
                const byfmt = this.injector.get<PipeTransform>('bytes-format');
                return throwError(() => new PacketLengthException(`Payload length ${byfmt.transform(len)} great than max size ${byfmt.transform(opts.payloadMaxSize)}`));
            }
        }

        return this.mergeClose(this.encode(ctx)
            .pipe(
                mergeMap(data => {
                    if (isNil(data)) return this.writeHeader(ctx);
                    if (this.streamAdapter.isReadable(data)) return this.pipe(data, ctx);
                    return this.write(data, ctx);
                })
            ))
    }

    receive(options: ServerOpts): Observable<TransportContext> {
        return this.message(options)
            .pipe(
                mergeMap(msg => this.concat(msg).pipe(mergeMap(data => this.decode(data, msg, options)))),
                share()
            )
    }

    protected encode(ctx: TransportContext): Observable<OutgoingType> {
        return this.encoder.handle(ctx)
            .pipe(
                map(data => this.afterEncode(ctx, data))
            )
    }

    protected afterEncode(ctx: TransportContext, buf: OutgoingType) {
        return buf;
    }

    protected decode(data: Buffer, msg: TMsg, options: ServerOpts): Observable<TransportContext> {
        const ctx = this.createContext(data, msg, options);
        ctx.session = this;
        return this.decoder.handle(ctx)
            .pipe(
                map(pkg => this.afterDecode(ctx, pkg, msg))
            );
    }

    protected afterDecode(incomingContext: IncomingContext, transportContext: TransportContext, msg: TMsg) {
        return transportContext;
    }


    protected abstract concat(msg: TMsg): Observable<Buffer>;
    protected abstract mergeClose(source: Observable<any>): Observable<any>;
    protected abstract message(options: ServerOpts): Observable<TMsg>;

    protected abstract writeHeader(ctx: TransportContext): Promise<void>;
    protected abstract pipe(ata: IReadableStream, ctx: TransportContext): Promise<void>;
    protected abstract write(data: Buffer, ctx: TransportContext): Promise<void>;

    protected abstract createContext(data: Buffer, msg: TMsg, options: ServerOpts): IncomingContext;


}


export interface TopicBuffer {
    topic: string;
    buffers: Buffer[];
    length: number;
    contentLength: number | null;
}



export abstract class BufferTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> extends AbstractServerTransportSession<TSocket, TMsg> implements TransportSession<TSocket> {

    protected topics: Map<string, TopicBuffer>;

    readonly delimiter: Buffer | undefined;
    readonly headDelimiter: Buffer | undefined;

    private allocator?: NumberAllocator;
    private last?: number;

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly streamAdapter: StreamAdapter,
        readonly encoder: Encoder,
        readonly decoder: Decoder,
        options: TransportOpts) {
        super();
        this.delimiter = Buffer.from(options.delimiter ?? '#');
        if (options.headDelimiter) this.headDelimiter = Buffer.from(options.headDelimiter);
        this.topics = new Map();
    }


    // protected override createContext(msgOrPkg: Packet | string | Buffer | Uint8Array, msg?: TMsg, options?: InvokeArguments) {
    //     return new Context(this.injector, this, msgOrPkg, msg ? this.getHeaders(msg) : undefined, this.delimiter, this.headDelimiter, options)
    // }

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
            const i = data.indexOf(this.delimiter!);
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

export abstract class PayloadTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> extends AbstractServerTransportSession<TSocket, TMsg> {

    // protected createContext(msgOrPkg: string | Packet<any> | Buffer | Uint8Array, msg?: TMsg | undefined, options?: InvokeArguments<any> | undefined): Context<Packet<any>> {
    //     return new Context(this.injector, this, msgOrPkg, msg ? this.getHeaders(msg) : undefined, undefined, undefined, options);
    // }

    protected abstract getHeaders(msg: TMsg): HeaderPacket | undefined;

}
