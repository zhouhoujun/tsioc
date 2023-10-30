import { Execption, Injector, InvokeArguments, isNil, isString, isUndefined } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import { AssetTransportOpts, Context, IEventEmitter, IncomingHeaders, InvalidJsonException, NotSupportedExecption, Packet, PacketLengthException, Receiver, RequestPacket, ResponsePacket, Sender, TransportOpts, TransportSession, ev, hdr, isBuffer } from '@tsdi/common';
import { Observable, defer, filter, first, fromEvent, lastValueFrom, map, merge, mergeMap, share, throwError, timeout } from 'rxjs';
import { NumberAllocator } from 'number-allocator';

export abstract class AbstractTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> implements TransportSession<TSocket, TMsg> {

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly sender: Sender,
        readonly receiver: Receiver,
        readonly options: TransportOpts) {
        this.contextFactory = this.contextFactory.bind(this);
    }

    abstract serialize(packet: Packet): Buffer;

    abstract deserialize(raw: Buffer): Packet<any>;


    send(packet: Packet): Observable<any> {
        const len = this.getPayloadLen(packet);
        if (len) {
            const opts = this.options as AssetTransportOpts;
            if (opts.payloadMaxSize && len > opts.payloadMaxSize) {
                const byfmt = this.injector.get<PipeTransform>('bytes-format');
                return throwError(() => new PacketLengthException(`Payload length ${byfmt.transform(len)} great than max size ${byfmt.transform(opts.payloadMaxSize)}`));
            }
        }

        return this.mergeClose(this.pack(packet)
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
        return this.message()
            .pipe(
                filter(msg => packet ? this.responseFilter(packet, msg) : true),
                mergeMap(msg => {
                    return this.unpack(msg);
                }),
                share()
            )
    }

    protected pack(packet: Packet): Observable<Buffer> {
        return this.sender.send(this.contextFactory, packet)
    }

    protected unpack(msg: TMsg): Observable<Packet> {
        if (!(isString(msg) || isBuffer(msg) || msg instanceof Uint8Array)) {
            return throwError(() => new NotSupportedExecption())
        }
        return this.receiver.receive(this.contextFactory, msg);
    }

    abstract destroy(): Promise<void>;


    protected abstract message(): Observable<TMsg>;

    protected abstract mergeClose(source: Observable<any>): Observable<any>;

    protected abstract write(data: Buffer, packet: Packet): Promise<void>;

    protected abstract beforeRequest(packet: RequestPacket<any>): Promise<void>;

    protected contextFactory(msgOrPkg: Packet | string | Buffer | Uint8Array, headDelimiter?: Buffer, options?: InvokeArguments) {
        return new Context(this.injector, this, msgOrPkg, headDelimiter, false, options)
    }

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


export abstract class EventTransportSession<TSocket extends IEventEmitter, TMsg = string | Buffer | Uint8Array> extends AbstractTransportSession<TSocket, TMsg> implements TransportSession<TSocket, TMsg> {

    private allocator?: NumberAllocator;
    private last?: number;

    protected message(): Observable<TMsg> {
        return fromEvent(this.socket, ev.DATA) as Observable<TMsg>;
    }

    serialize(packet: Packet): Buffer {
        let pkg: Packet;
        if (isUndefined(packet.length)) {
            pkg = packet;
        } else {
            const { length, ...data } = packet;
            pkg = data;
        }
        // if (withPayload) {
        //    const { length, ...data } = packet;
        //    pkg = data;
        // } else {
        //     const { payload, ...headers } = packet;
        //     pkg = headers;
        // }
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


    abstract destroy(): Promise<void>;

    protected mergeClose(source: Observable<any>) {
        const close$ = fromEvent(this.socket, ev.CLOSE).pipe(
            map(err => {
                throw err
            }));
        const error$ = fromEvent(this.socket, ev.ERROR);
        return merge(source, error$, close$).pipe(first());
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

}


export abstract class PayloadTransportSession<TSocket extends IEventEmitter, THeaders = IncomingHeaders, TMsg = string | Buffer | Uint8Array> extends AbstractTransportSession<TSocket, TMsg> {




    serialize(packet: Packet): Buffer {
        const payload = packet.payload;
        if (isNil(payload)) return Buffer.alloc(0);
        if (isBuffer(payload)) return payload;
        if (isString(payload)) return Buffer.from(payload);
        try {
            return Buffer.from(JSON.stringify(payload))
        } catch (err) {
            throw new InvalidJsonException(err, String(payload))
        }
    }

    deserialize(raw: Buffer): Packet<any> {
        const jsonStr = new TextDecoder().decode(raw);
        try {
            return JSON.parse(jsonStr);
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr);
        }
    }


}

