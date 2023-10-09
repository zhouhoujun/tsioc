import { Execption, isString } from '@tsdi/ioc';
import { IEventEmitter, Packet, Receiver, RequestPacket, ResponsePacket, Sender, TransportOpts, TransportSession, ev, isBuffer } from '@tsdi/common';
import { Observable, filter, first, from, fromEvent, lastValueFrom, map, merge, mergeMap, timeout } from 'rxjs';
import { NumberAllocator } from 'number-allocator';


export const defaultMaxSize = 1024 * 256;

const empt = {} as TransportOpts;

export abstract class AbstractTransportSession<TSocket> implements TransportSession<TSocket> {

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
            mergeMap(r => this.receive()),
            filter(p => this.match(packet, p)),
            first()
        );

        if (this.options.timeout) {
            obs$ = obs$.pipe(timeout(this.options.timeout))
        }
        return obs$;
    }

    receive(): Observable<ResponsePacket<any>> {
        return this.message()
            .pipe(
                mergeMap(msg => {
                    return this.unpack(msg);
                })
            )
    }

    protected pack(packet: Packet): Observable<Buffer> {
        return this.sender.send(packet)
    }

    protected unpack(msg: any): Observable<Packet<any>> {
        return this.receiver.receive(msg);
    }

    abstract destroy(): Promise<void>;

    protected abstract message(): Observable<any>;

    protected abstract mergeClose(source: Observable<any>): Observable<any>;

    protected abstract write(data: Buffer, packet: Packet): Promise<void>;


    protected match(req: RequestPacket, res: ResponsePacket) {
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


export abstract class EventTransportSession<TSocket extends IEventEmitter> extends AbstractTransportSession<TSocket> implements TransportSession<TSocket> {


    protected message(): Observable<any> {
        return fromEvent(this.socket, ev.DATA) as Observable<any>;
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

