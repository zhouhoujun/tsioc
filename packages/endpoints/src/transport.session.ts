import { Execption, isString } from '@tsdi/ioc';
import { IEventEmitter, NotSupportedExecption, Packet, Receiver, RequestPacket, ResponsePacket, Sender, TransportOpts, TransportSession, ev, isBuffer } from '@tsdi/common';
import { Observable, filter, first, from, fromEvent, lastValueFrom, map, merge, mergeMap, throwError, timeout } from 'rxjs';
import { NumberAllocator } from 'number-allocator';


export const defaultMaxSize = 1024 * 256;

const empt = {} as TransportOpts;

export abstract class AbstractTransportSession<TSocket, TMsg = string | Buffer | Uint8Array> implements TransportSession<TSocket, TMsg> {

    private allocator?: NumberAllocator;
    private last?: number;

    constructor(
        readonly socket: TSocket,
        readonly sender: Sender,
        readonly receiver: Receiver,
        readonly options: TransportOpts = empt) {

    }

    send(packet: Packet<any>): Observable<any> {
        return this.mergeClose(this.pack(packet)
            .pipe(
                mergeMap(data => {
                    return this.write(data, packet);
                })
            ))
    }

    request(packet: RequestPacket<any>): Observable<ResponsePacket<any>> {
        this.initRequest(packet);
        let obs$ = from(lastValueFrom(this.send(packet))).pipe(
            mergeMap(r => this.receive((msg) => this.reqMsgFilter(packet, msg))),
            filter(p => this.reqResFilter(packet, p)),
            first()
        );

        if (this.options.timeout) {
            obs$ = obs$.pipe(timeout(this.options.timeout))
        }
        return obs$;
    }

    receive(msgFilter?: (msg: TMsg) => boolean): Observable<ResponsePacket> {
        return this.message()
            .pipe(
                filter(msg => msgFilter ? msgFilter(msg) : true),
                mergeMap(msg => {
                    return this.unpack(msg);
                })
            )
    }

    protected pack(packet: Packet): Observable<Buffer> {
        return this.sender.send(packet)
    }

    protected unpack(msg: TMsg): Observable<Packet> {
        if (!(isString(msg) || isBuffer(msg) || msg instanceof Uint8Array)) {
            return throwError(() => new NotSupportedExecption())
        }
        return this.receiver.receive(msg);
    }

    abstract destroy(): Promise<void>;

    protected abstract message(): Observable<TMsg>;

    protected abstract mergeClose(source: Observable<any>): Observable<any>;

    protected abstract write(data: Buffer, packet: Packet): Promise<void>;

    protected reqMsgFilter(req: RequestPacket, msg: TMsg) {
        return true;
    }

    protected reqResFilter(req: RequestPacket, res: ResponsePacket) {
        return res.id == req.id
    }

    protected initRequest(packet: RequestPacket<any>) {
        if (!packet.id) {
            packet.id = this.getPacketId();
        }
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


export abstract class EventTransportSession<TSocket extends IEventEmitter, TMsg = string | Buffer | Uint8Array> extends AbstractTransportSession<TSocket, TMsg> implements TransportSession<TSocket, TMsg> {


    protected message(msgFilter?: (msg: TMsg) => boolean): Observable<TMsg> {
        const src$ = fromEvent(this.socket, ev.DATA) as Observable<TMsg>;
        return msgFilter ? src$.pipe(filter(msgFilter)) : src$;
    }


    abstract destroy(): Promise<void>;

    protected mergeClose(source: Observable<any>) {
        const close$ = fromEvent(this.socket, ev.CLOSE).pipe(
            map(err => {
                throw err
            }));
        return merge(source, close$).pipe(first());
    }

    protected abstract write(data: Buffer, packet: Packet): Promise<void>;

}

