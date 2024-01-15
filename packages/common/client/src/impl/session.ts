import { Injector, isDefined } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import {
    Packet, PacketLengthException, ResponsePacket, TransportEvent, TransportOpts, AssetTransportOpts, TransportRequest, BufferTransportSession,
    StreamAdapter, IEventEmitter, ev, XSSI_PREFIX, InvalidJsonException, StatusAdapter, ResponseEventFactory, MimeAdapter, RequestPacket
} from '@tsdi/common';
import { Observable, defer, first, fromEvent, lastValueFrom, map, merge, mergeMap, share, throwError, timeout } from 'rxjs';
import { RequestContext, RequestEncoder, ResponseContext, ResponseDecoder } from '../transport/codings';
import { ClientTransportSession } from '../transport/session';


/**
 * abstract client transport session.
 */
export abstract class AbstractClientTransportSession<TSocket, TMsg = any> extends ClientTransportSession<TSocket, TMsg> {

    send(req: TransportRequest): Observable<RequestContext> {
        const len = req.getContentLength();
        if (len) {
            const opts = this.options as AssetTransportOpts;
            if (opts.payloadMaxSize && len > opts.payloadMaxSize) {
                const byfmt = this.injector.get<PipeTransform>('bytes-format');
                return throwError(() => new PacketLengthException(`Payload length ${byfmt.transform(len)} great than max size ${byfmt.transform(opts.payloadMaxSize)}`));
            }
        }
        const ctx = this.createReqContext(req);
        return this.mergeClose(this.encode(ctx))
            .pipe(
                mergeMap(data => this.writeMessage(data, req)),
                map(() => ctx)
            )
    }

    request(req: TransportRequest): Observable<TransportEvent> {
        let obs$ = defer(() => this.requesting(req)).pipe(
            mergeMap(ctx => this.receive(ctx))
        );

        if (this.options.timeout) {
            obs$ = obs$.pipe(timeout(this.options.timeout))
        }
        return obs$;
    }

    receive(ctx: RequestContext): Observable<TransportEvent> {
        return this.message(ctx)
            .pipe(
                mergeMap(msg => this.decode(msg, ctx)),
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

    protected encode(ctx: RequestContext): Observable<TMsg> {
        return this.encoder.handle(ctx)
    }

    protected decode(msg: TMsg, req: RequestContext): Observable<TransportEvent> {
        const ctx = this.createResContext(msg, req);
        return this.decoder.handle(ctx)
    }

    abstract writeMessage(msg: TMsg, req: TransportRequest): Promise<void>;

    protected abstract mergeClose(source: Observable<any>): Observable<any>;

    protected abstract message(ctx?: RequestContext): Observable<TMsg>;

    protected createReqContext(req: TransportRequest): RequestContext {
        return {
            req,
            session: this
        }
    }

    protected createResContext(msg: TMsg, reqCtx: RequestContext): ResponseContext {
        return {
            msg,
            req: reqCtx.req,
            reqCtx,
            session: this
        }
    }

    protected async requesting(req: TransportRequest): Promise<RequestContext> {
        return await lastValueFrom(this.send(req))
    }

}

/**
 * client buffer transport session.
 */
export abstract class ClientBufferTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> extends AbstractClientTransportSession<TSocket, TMsg> implements BufferTransportSession<TSocket> {

    delimiter: Buffer;
    headDelimiter?: Buffer;

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly statusAdapter: StatusAdapter | null,
        readonly mimeAdapter: MimeAdapter | null,
        readonly streamAdapter: StreamAdapter,
        readonly eventFactory: ResponseEventFactory,
        readonly encoder: RequestEncoder,
        readonly decoder: ResponseDecoder,
        readonly options: TransportOpts) {
        super();

        this.delimiter = Buffer.from(options.delimiter ?? '#');
        if (options.headDelimiter) {
            this.headDelimiter = Buffer.from(options.headDelimiter);
        }
    }

    protected abstract getPayload(msg: TMsg): string | Buffer | Uint8Array;

    protected getResHeaders(msg: TMsg): ResponsePacket | undefined {
        return undefined;
    }

}

/**
 * client event transport session.
 */
export abstract class ClientEventTransportSession<TSocket extends IEventEmitter, TMsg = any> extends ClientBufferTransportSession<TSocket, TMsg> {

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

/**
 * client payload transport session.
 */
export abstract class ClientPayloadTransportSession<TSocket, TMsg = any> extends AbstractClientTransportSession<TSocket, TMsg> {

    protected abstract getResHeaders(msg: TMsg): ResponsePacket | undefined;
}

