import { Injectable, Injector, Optional, promisify } from '@tsdi/ioc';
import {
    IDuplexStream, IReadableStream, ResponseEventFactory, TransportOpts, TransportRequest,
    PacketBuffer, IncomingAdapter, OutgoingAdapter, StatusAdapter, StreamAdapter
} from '@tsdi/common';
import { ClientEventTransportSession } from './session';
import { ClientTransportSessionFactory } from '../transport/session';
import { RequestEncoder, ResponseDecoder } from '../transport/codings';


/**
 * client duplex transport session.
 */
export class ClientDuplexTransportSession extends ClientEventTransportSession<IDuplexStream> {

    protected writeHeader(req: TransportRequest<any>): Promise<void> {
        const headBuff = this.serialize(this.generatePacket(req, true));
        return promisify<Buffer, void>(this.socket.write, this.socket)(headBuff);
    }
    protected pipe(data: IReadableStream, req: TransportRequest<any>): Promise<void> {
        return this.streamAdapter.pipeTo(data, this.socket)
    }

    writeMessage(data: Buffer, req: TransportRequest<any>): Promise<void> {
        return promisify<Buffer, void>(this.socket.write, this.socket)(data);
    }

    protected async beforeRequest(packet: TransportRequest<any>): Promise<void> { }

    protected getTopic(msg: string | Buffer | Uint8Array): string {
        return '__DEFALUT_TOPIC__'
    }

    protected getPayload(msg: string | Buffer | Uint8Array): string | Buffer | Uint8Array {
        return msg;
    }

    override async destroy(): Promise<void> {
        this.socket.destroy?.();
        this.packetBuffer.clear();
    }
}

/**
 * client duplex transport session factory.
 */
@Injectable()
export class ClientDuplexTransportSessionFactory implements ClientTransportSessionFactory<IDuplexStream> {

    constructor(
        readonly injector: Injector,
        @Optional() private statusAdapter: StatusAdapter,
        @Optional() private incomingAdapter: IncomingAdapter,
        @Optional() private outgoingAdapter: OutgoingAdapter,
        private streamAdapter: StreamAdapter,
        private eventFactory: ResponseEventFactory,
        private encoder: RequestEncoder,
        private decoder: ResponseDecoder) { }

    create(socket: IDuplexStream, options: TransportOpts): ClientDuplexTransportSession {
        return new ClientDuplexTransportSession(this.injector, socket, this.statusAdapter, this.incomingAdapter, this.outgoingAdapter, this.streamAdapter, this.eventFactory, this.encoder, this.decoder, new PacketBuffer(), options);
    }

}
