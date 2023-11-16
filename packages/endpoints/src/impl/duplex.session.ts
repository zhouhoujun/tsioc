import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { IDuplexStream, Packet, RequestPacket, StreamAdapter, TransportOpts } from '@tsdi/common';
import { EventTransportSession } from './transport.session';
import { IncomingDecoder, OutgoingEncoder } from '../transport/codings';
import { ServerTransportSessionFactory } from '../transport/session';



export class DuplexTransportSession extends EventTransportSession<IDuplexStream> {

    protected getTopic(msg: string | Buffer | Uint8Array): string {
        return '__DEFALUT_TOPIC__'
    }
    protected getPayload(msg: string | Buffer | Uint8Array): string | Buffer | Uint8Array {
        return msg;
    }

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
export class DuplexTransportSessionFactory implements ServerTransportSessionFactory<IDuplexStream> {

    constructor(
        readonly injector: Injector,
        private streamAdapter: StreamAdapter,
        private encoder: OutgoingEncoder,
        private decoder: IncomingDecoder) { }

    create(socket: IDuplexStream, options: TransportOpts): DuplexTransportSession {
        return new DuplexTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, options);
    }

}
