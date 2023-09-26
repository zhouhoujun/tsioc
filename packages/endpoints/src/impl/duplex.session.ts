import { Execption, Injectable, promisify } from '@tsdi/ioc';
import { IDuplexStream, Packet, Receiver, RequestPacket, ResponsePacket, Sender, TransportFactory, TransportOpts, TransportSession, TransportSessionFactory, ev } from '@tsdi/common';
import { Observable, filter, first, fromEvent, map, merge, mergeMap } from 'rxjs';
import { NumberAllocator } from 'number-allocator';


export const defaultMaxSize = 1024 * 256;


export class DuplexTransportSession implements TransportSession<IDuplexStream> {

    allocator?: NumberAllocator;
    last?: number;
    dataEvent: any;

    constructor(
        readonly socket: IDuplexStream,
        readonly sender: Sender,
        readonly receiver: Receiver) {

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
                mergeMap(r => this.receiver.packet.pipe(filter(p => p.id == id)))
            )
    }



    async destroy(): Promise<void> {
        this.socket.off(ev.DATA, this.dataEvent);
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
        this.dataEvent = this.receiver.receive.bind(this.receiver);
        this.socket.on(ev.DATA, this.dataEvent);
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

    create(socket: IDuplexStream, options?: TransportOpts | undefined): DuplexTransportSession {
        return new DuplexTransportSession(socket, this.factory.createSender(options), this.factory.createReceiver(options));
    }

}
