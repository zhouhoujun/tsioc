import { Injector } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import {
    IEventEmitter, Packet, PacketLengthException, BufferTransportSession,
    StreamAdapter, TransportOpts, AssetTransportOpts, HeaderPacket, ev, XSSI_PREFIX, InvalidJsonException,
    ResponsePacket, StatusAdapter, IncomingAdapter, OutgoingAdapter, MimeAdapter, FileAdapter
} from '@tsdi/common';
import { Observable, filter, first, fromEvent, map, merge, mergeMap, share, throwError } from 'rxjs';
import { ServerTransportSession } from '../transport/session';
import { IncomingContext, IncomingDecoder, IncomingPacketContext, IncomingPacketDecoder, OutgoingEncoder, OutgoingPacketContext, OutgoingPacketEncoder } from '../transport/codings';
import { TransportContext } from '../TransportContext';
import { ServerOpts } from '../Server';



export abstract class AbstractServerTransportSession<TSocket, TMsg = any> extends ServerTransportSession<TSocket, TMsg> {

    abstract get encoder(): OutgoingEncoder;

    abstract get decoder(): IncomingDecoder;

    abstract get packetEncoder(): OutgoingPacketEncoder<TMsg>;
    abstract get packetDecoder(): IncomingPacketDecoder<TMsg>;

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
                    return this.writeMessage(data, ctx);
                })
            ))
    }

    receive(options: ServerOpts): Observable<TransportContext> {
        return this.message(options)
            .pipe(
                mergeMap(msg => this.decode(msg, options)),
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


    protected encode(ctx: TransportContext): Observable<TMsg> {
        return this.encoder.handle(ctx)
            .pipe(
                filter(pkg => !!pkg),
                mergeMap(outgoing => {
                    return this.packetEncoder.handle(this.createOutgoingContext(ctx, outgoing, this.options));
                })
            )
    }

    protected decode(msg: TMsg, options: ServerOpts): Observable<TransportContext> {
        const ctx = this.createIncomingContext(msg, options);
        ctx.session = this;
        return this.packetDecoder.handle(ctx)
            .pipe(
                filter(pkg => !!pkg),
                mergeMap(pkg => {
                    ctx.incoming = pkg;
                    return this.decoder.handle(ctx as IncomingContext)
                })
            );
    }

    protected abstract mergeClose(source: Observable<any>): Observable<any>;
    protected abstract message(options: ServerOpts): Observable<TMsg>;

    protected createOutgoingContext(context: TransportContext, outgoing: ResponsePacket, options: ServerOpts): OutgoingPacketContext<TMsg> {
        return {
            session: this,
            options,
            context,
            outgoing
        }
    }

    protected createIncomingContext(msg: TMsg, options: ServerOpts): IncomingPacketContext<TMsg> {
        return {
            session: this,
            options,
            msg
        }
    }



    // generatePacket(ctx: TransportContext, noPayload?: boolean): Packet {
    //     if (isPlainObject(ctx.response)) {
    //         return noPayload ? lang.omit(ctx.response, 'payload') : ctx.response
    //     } else {
    //         const res = ctx.response as Outgoing;
    //         const pkg = {
    //             id: res.id,
    //             status: res.statusCode,
    //             statusText: res.statusMessage,
    //             headers: res.getHeaders?.() ?? res.headers
    //         } as ResponsePacket;
    //         this.setPacketPattern(pkg, ctx);
    //         if (!noPayload) {
    //             pkg.payload = ctx.body;
    //         }
    //         return pkg;
    //     }
    // }

    // protected setPacketPattern(pkg: ResponsePacket, ctx: TransportContext) {

    // }

    // protected abstract writeHeader(ctx: TransportContext): Promise<void>;
    // protected abstract pipe(data: IReadableStream, ctx: TransportContext): Promise<void>;

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
        readonly packetEncoder: OutgoingPacketEncoder<TMsg>,
        readonly packetDecoder: IncomingPacketDecoder<TMsg>,
        // protected packetBuffer: PacketBuffer,
        readonly options: TransportOpts) {
        super();

        this.delimiter = Buffer.from(options.delimiter || '#');
        if (options.headDelimiter) {
            this.headDelimiter = Buffer.from(options.headDelimiter);
        }
    }

    // protected override createContext(data: Buffer | IReadableStream, msg: TMsg, options: ServerOpts): IncomingContext {
    //     const packet = msg ? this.getHeaders(msg) : undefined
    //     return {
    //         session: this,
    //         incoming: packet,
    //         options,
    //         raw: data
    //     }
    // }

    // protected concat(msg: TMsg): Observable<Buffer> {
    //     return this.packetBuffer.concat(this, this.getTopic(msg), this.getPayload(msg))
    // }

    protected abstract getTopic(msg: TMsg): string;

    protected abstract getPayload(msg: TMsg): string | Buffer | Uint8Array;

    protected getHeaders(msg: TMsg): HeaderPacket | undefined {
        return undefined;
    }


    async destroy(): Promise<void> {
    
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

    protected abstract getHeaders(msg: TMsg): HeaderPacket | undefined;

}
