import { Execption, Injectable, promisify } from '@tsdi/ioc';
import { IDuplexStream, Packet, Receiver, RequestPacket, ResponsePacket, Sender, Transport, TransportFactory, TransportOpts, TransportSession, TransportSessionFactory, ev } from '@tsdi/common';
import { Observable, Subscription, filter, first, fromEvent, map, merge, mergeMap } from 'rxjs';
import { NumberAllocator } from 'number-allocator';


export const defaultMaxSize = 1024 * 256;


const empt = {} as TransportOpts;

export class DuplexTransportSession implements TransportSession<IDuplexStream> {

    allocator?: NumberAllocator;
    last?: number;

    subs: Subscription;

    constructor(
        readonly socket: IDuplexStream,
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
                    return promisify<Buffer, void>(this.socket.write, this.socket)(data);
                })
            ))
    }


    request(packet: RequestPacket<any>): Observable<ResponsePacket<any>> {
        if (!packet.id) {
            packet.id = this.getPacketId();
        }
        const id = packet.id;
        return this.send(packet)
            .pipe(
                mergeMap(r => this.receiver.packet.pipe(
                    filter(p => p.id == id)
                ))
            )
    }



    async destroy(): Promise<void> {
        this.subs?.unsubscribe();
        this.socket.destroy?.();
    }


    protected mergeClose(source: Observable<any>) {
        const close$ = fromEvent(this.socket, ev.CLOSE).pipe(
            map(err => {
                throw err
            }));
        return merge(source, close$).pipe(first());
    }

    protected bindDataEvent() {
        this.subs.add(fromEvent(this.socket, ev.DATA).subscribe(data => this.receiver.receive(data)))

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

@Injectable()
export class DuplexTransportSessionFactory implements TransportSessionFactory<IDuplexStream> {

    constructor(private factory: TransportFactory) { }

    create(socket: IDuplexStream, transport: Transport, options?: TransportOpts): DuplexTransportSession {
        return new DuplexTransportSession(socket, this.factory.createSender(transport, options), this.factory.createReceiver(transport, options), options);
    }

}
