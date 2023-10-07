import { Execption } from '@tsdi/ioc';
import { IEventEmitter, Packet, Receiver, RequestPacket, ResponsePacket, Sender, TransportOpts, TransportSession, ev } from '@tsdi/common';
import { Observable, Subscription, filter, first, from, fromEvent, lastValueFrom, map, merge, mergeMap, timeout } from 'rxjs';
import { NumberAllocator } from 'number-allocator';


export const defaultMaxSize = 1024 * 256;

const empt = {} as TransportOpts;

export abstract class AbstractTransportSession<TSocket extends IEventEmitter> implements TransportSession<TSocket> {

    private allocator?: NumberAllocator;
    private last?: number;

    protected subs: Subscription;

    constructor(
        readonly socket: TSocket,
        readonly sender: Sender,
        readonly receiver: Receiver,
        readonly options: TransportOpts = empt) {

        this.subs = new Subscription();
        this.bindDataEvent();

    }

    send(packet: Packet<any>): Observable<any> {
        return this.mergeClose(this.sender.send(packet)
            .pipe(
                mergeMap(data => {
                    return this.write(data, packet);
                })
            ))
    }


    request(packet: RequestPacket<any>): Observable<ResponsePacket<any>> {
        this.initRequest(packet);
        const id = packet.id;
        let obs$ = from(lastValueFrom(this.send(packet))).pipe(
            mergeMap(r => this.receiver.packet.pipe(
                filter(p => p.id == id)
            )));

        if (this.options.timeout) {
            obs$ = obs$.pipe(timeout(this.options.timeout))
        }
        return obs$;
    }

    protected initRequest(packet: RequestPacket<any>) {
        if (!packet.id) {
            packet.id = this.getPacketId();
        }
    }

    abstract destroy(): Promise<void>;


    protected mergeClose(source: Observable<any>) {
        const close$ = fromEvent(this.socket, ev.CLOSE).pipe(
            map(err => {
                throw err
            }));
        return merge(source, close$).pipe(first());
    }

    protected bindDataEvent() {
        this.subs.add(fromEvent(this.socket, this.getMessageEvent()).subscribe(data => this.receiver.receive(data)))
    }

    protected getMessageEvent() {
        return ev.DATA;
    }


    protected abstract write(data: Buffer, packet: Packet): Promise<void>;

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

