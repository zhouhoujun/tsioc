import { Injectable, promisify } from '@tsdi/ioc';
import { IDuplexStream, Packet, RequestPacket, Transport, TransportFactory, TransportOpts, TransportSessionFactory } from '@tsdi/common';
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

    constructor(private factory: TransportFactory) { }

    create(socket: IDuplexStream, transport: Transport, options?: TransportOpts): DuplexTransportSession {
        return new DuplexTransportSession(socket, this.factory.createSender(socket, transport, options), this.factory.createReceiver(socket, transport, options), this.factory.injector.get('bytes-format'), options);
    }

}
