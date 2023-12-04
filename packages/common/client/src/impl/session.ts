import { Execption, Injector, isDefined, isNil } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import {
    IReadableStream, OutgoingType, Packet, PacketLengthException, RequestPacket, ResponsePacket,
    TransportEvent, TransportOpts, AssetTransportOpts, TransportRequest, hdr,
    StreamAdapter, PacketBuffer, IEventEmitter, ev, XSSI_PREFIX, InvalidJsonException, BufferTransportSession, StatusVaildator
} from '@tsdi/common';
import { Observable, defer, filter, first, fromEvent, lastValueFrom, map, merge, mergeMap, share, throwError, timeout } from 'rxjs';
import { NumberAllocator } from 'number-allocator';
import { RequestContext, RequestEncoder, ResponseContext, ResponseDecoder } from '../transport/codings';
import { ClientTransportSession } from '../transport/session';



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
                    return this.writeMessage(data, req);
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

    generatePacket(req: TransportRequest, noPayload?: boolean): Packet<any> {
        const pkg = {
        } as RequestPacket;
        if (req.method) {
            pkg.method = req.method;
        }
        if (req.headers.size) {
            pkg.headers = req.headers.getHeaders()
        }
        if (!noPayload && isDefined(req.body)) {
            pkg.payload = req.body;
        }
        this.setPacketPattern(pkg, req);

        return pkg;
    }

    protected setPacketPattern(pkg: RequestPacket, req: TransportRequest) {
        pkg.url = req.urlWithParams
    }

    protected encode(req: TransportRequest): Observable<OutgoingType> {
        return this.encoder.handle(this.createReqContext(req))
            .pipe(
                map(data => this.afterEncode(req, data)),
            )
    }

    protected afterEncode(req: TransportRequest, data: OutgoingType) {
        return data;
    }

    protected decode(data: Buffer, msg: TMsg, req: TransportRequest): Observable<TransportEvent> {
        const ctx = this.createResContext(data, msg, req);
        return this.decoder.handle(ctx)
            .pipe(
                map(pkg => this.afterDecode(ctx, pkg, msg))
            );
    }

    protected afterDecode(ctx: ResponseContext, pkg: TransportEvent, msg: TMsg) {
        return pkg;
    }

    protected abstract writeHeader(req: TransportRequest): Promise<void>;
    protected abstract pipe(data: IReadableStream, req: TransportRequest): Promise<void>;
    
    /**
     * write encode request message.
     * @param data 
     * @param packet 
     */
    abstract writeMessage(data: Buffer, req: TransportRequest): Promise<void>;

    protected abstract concat(msg: TMsg): Observable<Buffer>;

    protected abstract mergeClose(source: Observable<any>): Observable<any>;

    protected abstract message(packet?: Packet): Observable<TMsg>;

    protected abstract beforeRequest(packet: TransportRequest): Promise<void>;

    protected createReqContext(req: TransportRequest): RequestContext {
        return {
            req,
            session: this
        }
    }

    protected abstract createResContext(data: Buffer, msg: TMsg, req: TransportRequest): ResponseContext;

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


export abstract class ClientBufferTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> extends AbstractClientTransportSession<TSocket, TMsg> implements BufferTransportSession<TSocket> {

    private allocator?: NumberAllocator;
    private last?: number;
    delimiter: Buffer;
    headDelimiter?: Buffer | undefined;

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly statusVaildator: StatusVaildator,
        readonly streamAdapter: StreamAdapter,
        readonly encoder: RequestEncoder,
        readonly decoder: ResponseDecoder,
        protected packetBuffer: PacketBuffer,
        readonly options: TransportOpts) {
        super();

        this.delimiter = Buffer.from(options.delimiter || '#');
        if(options.headDelimiter) {
            this.headDelimiter = Buffer.from(options.headDelimiter);
        }
    }


    protected createResContext(data: Buffer, msg: TMsg, req: TransportRequest): ResponseContext {
        const packet = this.getResHeaders(msg) ?? {};
        return {
            session: this,
            req,
            packet
        }
    }

    protected concat(msg: TMsg): Observable<Buffer> {
        return this.packetBuffer.concat(this, this.getTopic(msg), this.getPayload(msg))
    }

    protected abstract getTopic(msg: TMsg): string;

    protected abstract getPayload(msg: TMsg): string | Buffer | Uint8Array;

    protected getResHeaders(msg: TMsg): ResponsePacket | undefined {
        return undefined;
    }


    async destroy(): Promise<void> {
        this.packetBuffer.clear();
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

}

export abstract class ClientEventTransportSession<TSocket extends IEventEmitter, TMsg = string | Buffer | Uint8Array> extends ClientBufferTransportSession<TSocket, TMsg> {

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

export abstract class ClientPayloadTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> extends AbstractClientTransportSession<TSocket, TMsg> {

    protected createResContext(data: Buffer, msg: TMsg, req: TransportRequest): ResponseContext {
        const packet = this.getResHeaders(msg) ?? {};
        return {
            session: this,
            req,
            packet,
            raw: data
        }
    }

    protected abstract getResHeaders(msg: TMsg): ResponsePacket | undefined;

}

