import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { IDuplexStream, Packet, RequestPacket, TransportFactory, TransportOpts, TransportSessionFactory } from '@tsdi/common';
import { EventTransportSession } from '../transport.session';



export class DuplexTransportSession extends EventTransportSession<IDuplexStream> {

    protected override async beforeRequest(packet: RequestPacket<any>): Promise<void> {
        // do nothing
    }

    protected override write(data: Buffer, packet: Packet): Promise<void> {
        return promisify<Buffer, void>(this.socket.write, this.socket)(data);
    }

    override async destroy(): Promise<void> {
        this.socket.destroy?.();
    }
}

@Injectable()
export class DuplexTransportSessionFactory implements TransportSessionFactory<IDuplexStream> {

    constructor(readonly injector: Injector, private factory: TransportFactory) { }

    create(socket: IDuplexStream, options: TransportOpts): DuplexTransportSession {
        return new DuplexTransportSession(this.injector, socket, this.factory.createSender(options), this.factory.createReceiver(options), options);
    }

}
