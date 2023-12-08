import { Injector, isNil, isPlainObject, lang } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import {
    IEventEmitter, IReadableStream, OutgoingType, Packet, PacketBuffer, PacketLengthException, BufferTransportSession,
    StreamAdapter, TransportOpts, AssetTransportOpts, HeaderPacket, ev, XSSI_PREFIX, InvalidJsonException, Outgoing,
    ResponsePacket, StatusAdapter, IncomingAdapter, OutgoingAdapter, MimeAdapter, FileAdapter
} from '@tsdi/common';
import { Observable, first, fromEvent, map, merge, mergeMap, share, throwError } from 'rxjs';
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
                    return this.writeMessage(data, ctx);
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

    serialize(packet: Packet): Buffer {
        return Buffer.from(JSON.stringify(packet));
    }

    deserialize(raw: Buffer): Packet<any> {
        let src = new TextDecoder().decode(raw);
        try {
            src = src.replace(XSSI_PREFIX, '');
            return src !== '' ? JSON.parse(src) : null
        } catch (err) {
            throw new InvalidJsonException(err, src)
        }
    }

    generatePacket(ctx: TransportContext, noPayload?: boolean): Packet {
        if (isPlainObject(ctx.response)) {
            return noPayload ? lang.omit(ctx.response, 'payload') : ctx.response
        } else {
            const res = ctx.response as Outgoing;
            const pkg = {
                id: res.id,
                status: res.statusCode,
                statusText: res.statusMessage,
                headers: res.getHeaders?.() ?? res.headers
            } as ResponsePacket;
            this.setPacketPattern(pkg, ctx);
            if (!noPayload) {
                pkg.payload = ctx.body;
            }
            return pkg;
        }
    }

    protected setPacketPattern(pkg: ResponsePacket, ctx: TransportContext) {

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

    protected decode(data: Buffer | IReadableStream, msg: TMsg, options: ServerOpts): Observable<TransportContext> {
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


    protected abstract concat(msg: TMsg): Observable<Buffer | IReadableStream>;
    protected abstract mergeClose(source: Observable<any>): Observable<any>;
    protected abstract message(options: ServerOpts): Observable<TMsg>;

    protected abstract writeHeader(ctx: TransportContext): Promise<void>;
    protected abstract pipe(data: IReadableStream, ctx: TransportContext): Promise<void>;

    protected abstract createContext(data: Buffer | IReadableStream, msg: TMsg, options: ServerOpts): IncomingContext;


}


export interface TopicBuffer {
    topic: string;
    buffers: Buffer[];
    length: number;
    contentLength: number | null;
}



export abstract class ServerBufferTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> extends AbstractServerTransportSession<TSocket, TMsg> implements BufferTransportSession<TSocket> {

    delimiter: Buffer;
    headDelimiter?: Buffer | undefined;
    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly statusAdapter: StatusAdapter | null,
        readonly incomingAdapter: IncomingAdapter | null,
        readonly outgoingAdapter: OutgoingAdapter | null,
        readonly mimeAdapter: MimeAdapter | null,
        readonly fileAdapter: FileAdapter,
        readonly streamAdapter: StreamAdapter,
        readonly encoder: OutgoingEncoder,
        readonly decoder: IncomingDecoder,
        protected packetBuffer: PacketBuffer,
        readonly options: TransportOpts) {
        super();

        this.delimiter = Buffer.from(options.delimiter || '#');
        if (options.headDelimiter) {
            this.headDelimiter = Buffer.from(options.headDelimiter);
        }
    }

    protected override createContext(data: Buffer | IReadableStream, msg: TMsg, options: ServerOpts): IncomingContext {
        const packet = msg ? this.getHeaders(msg) : undefined
        return {
            session: this,
            packet,
            options,
            raw: data
        }
    }

    protected concat(msg: TMsg): Observable<Buffer> {
        return this.packetBuffer.concat(this, this.getTopic(msg), this.getPayload(msg))
    }

    protected abstract getTopic(msg: TMsg): string;

    protected abstract getPayload(msg: TMsg): string | Buffer | Uint8Array;

    protected getHeaders(msg: TMsg): HeaderPacket | undefined {
        return undefined;
    }


    async destroy(): Promise<void> {
        this.packetBuffer.clear();
    }

}


export abstract class ServerEventTransportSession<TSocket extends IEventEmitter, TMsg = string | Buffer | Uint8Array> extends ServerBufferTransportSession<TSocket, TMsg> {

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

export abstract class ServerPayloadTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> extends AbstractServerTransportSession<TSocket, TMsg> {

    protected override createContext(data: Buffer | IReadableStream, msg: TMsg, options: ServerOpts): IncomingContext {
        const packet = msg ? this.getHeaders(msg) : undefined
        return {
            session: this,
            packet,
            options,
            raw: data
        }
    }

    protected abstract getHeaders(msg: TMsg): HeaderPacket | undefined;

}
