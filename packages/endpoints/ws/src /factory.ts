import { IDuplexStream, Packet, Receiver, RequestPacket, ResponsePacket, Sender, TransportSession } from '@tsdi/common';
import { Observable, filter, mergeMap } from 'rxjs';
import { NumberAllocator } from 'number-allocator';
import { Execption, promisify } from '@tsdi/ioc';

export class WsTransportSession implements TransportSession {

    allocator?: NumberAllocator;
    last?: number;
    dataEvent: any;

    constructor(
        readonly socket: IDuplexStream,
        readonly sender: Sender,
        readonly receiver: Receiver) {

        this.dataEvent = this.receiver.receive.bind(this.receiver);
        this.socket.on('message', this.dataEvent)
    }


    send(packet: Packet<any>): Observable<any> {
        return this.sender.send(packet)
            .pipe(
                mergeMap(data=> {
                    return promisify(this.socket.write, this.socket)(data);
                })
            )
    }


    request(packet: RequestPacket<any>): Observable<ResponsePacket<any>> {
        if (!packet.id) {
            packet.id = this.getPacketId();
        }
        const id = packet.id;
        return this.sender.send(packet)
            .pipe(
                mergeMap(r => this.receiver.packet.pipe(filter(p => p.id == id)))
            )
    }



    async destroy(): Promise<void> {
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