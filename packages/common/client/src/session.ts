import { Abstract, Injector, isNil } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import {
    IReadableStream, OutgoingType, Packet, PacketLengthException, RequestPacket, ResponsePacket,
    TransportEvent, TransportOpts, AssetTransportOpts, TransportRequest, TransportSession, hdr
} from '@tsdi/common';
import { Observable, defer, filter, lastValueFrom, map, mergeMap, share, throwError, timeout } from 'rxjs';
import { RequestEncoder, ResponseContext, ResponseDecoder } from './codings';

/**
 * transport session.
 */
@Abstract()
export abstract class ClientTransportSession<TSocket = any> extends TransportSession<TSocket, TransportRequest>  {
    /**
     * send request message.
     * @param packet 
     */
    abstract send(req: TransportRequest): Observable<any>;
    /**
     * request.
     * @param packet 
     */
    abstract request(req: TransportRequest): Observable<TransportEvent>;


}


/**
 * client transport session factory.
 */
@Abstract()
export abstract class ClientTransportSessionFactory<TSocket = any> {
    /**
     * injector.
     */
    abstract get injector(): Injector;
    /**
     * create transport session.
     * @param options 
     */
    abstract create(socket: TSocket, options: TransportOpts): ClientTransportSession<TSocket>;
}



export abstract class AbstractClientTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> extends ClientTransportSession<TSocket> {

    abstract get encoder(): RequestEncoder;

    abstract get decoder(): ResponseDecoder;

    send(req: TransportRequest): Observable<any> {
        const len = this.getPayloadLen(req);
        if (len) {
            const opts = this.options as AssetTransportOpts;
            if (opts.payloadMaxSize && len > opts.payloadMaxSize) {
                const byfmt = this.injector.get<PipeTransform>('bytes-format');
                return throwError(() => new PacketLengthException(`Payload length ${byfmt.transform(len)} great than max size ${byfmt.transform(opts.payloadMaxSize)}`));
            }
        }

        return this.mergeClose(this.encode(req)
            .pipe(
                mergeMap(data => {
                    if (isNil(data)) return this.writeHeader(req);
                    if (this.streamAdapter.isReadable(data)) return this.pipe(data, req);
                    return this.write(data, req);
                })
            ))
    }

    request(req: TransportRequest): Observable<TransportEvent> {
        let obs$ = defer(() => this.requesting(req)).pipe(
            mergeMap(r => this.receive(req)),
            filter(p => this.responsePacketFilter(req, p))
        );

        if (this.options.timeout) {
            obs$ = obs$.pipe(timeout(this.options.timeout))
        }
        return obs$;
    }

    receive(req: TransportRequest): Observable<TransportEvent> {
        return this.message(req)
            .pipe(
                filter(msg => this.responseFilter(req, msg)),
                mergeMap(msg => this.concat(msg).pipe(mergeMap(data => this.decode(data, msg, req)))),
                share()
            )
    }

    protected encode(req: TransportRequest): Observable<OutgoingType> {
        return this.encoder.handle(req)
            .pipe(
                map(data => this.afterEncode(req, data)),
            )
    }

    protected afterEncode(req: TransportRequest, data: OutgoingType) {
        return data;
    }

    protected decode(data: Buffer, msg: TMsg, req: TransportRequest): Observable<TransportEvent> {
        const ctx = this.createContext(data, msg, req);
        return this.decoder.handle(ctx)
            .pipe(
                map(pkg => this.afterDecode(ctx, pkg, msg))
            );
    }

    protected afterDecode(ctx: ResponseContext, pkg: TransportEvent, msg: TMsg) {
        return pkg;
    }

    protected abstract writeHeader(req: TransportRequest): Promise<void>;
    protected abstract pipe(ata: IReadableStream, req: TransportRequest): Promise<void>;
    /**
     * write packet buffer.
     * @param data 
     * @param packet 
     */
    abstract write(data: Buffer, packet: Packet): Promise<void>;

    protected abstract concat(msg: TMsg): Observable<Buffer>;

    protected abstract mergeClose(source: Observable<any>): Observable<any>;

    protected abstract message(packet?: Packet): Observable<TMsg>;

    protected abstract beforeRequest(packet: TransportRequest): Promise<void>;

    protected abstract createContext(msgOrPkg: Packet | string | Buffer | Uint8Array, msg: TMsg, req: TransportRequest): ResponseContext;

    protected async requesting(packet: TransportRequest): Promise<void> {
        this.bindPacketId(packet);
        await this.beforeRequest(packet);
        await lastValueFrom(this.send(packet))
    }

    protected getPayloadLen(req: TransportRequest) {
        return ~~(req.headers.get(hdr.CONTENT_LENGTH) ?? '0')
    }

    protected responseFilter(req: RequestPacket, msg: TMsg) {
        return true;
    }

    protected responsePacketFilter(req: RequestPacket, res: ResponsePacket) {
        return res.id == req.id
    }

    protected bindPacketId(req: TransportRequest): void {
        if (!req.id) {
            req.id = this.getPacketId();
        }
    }

    protected abstract getPacketId(): string | number;

}