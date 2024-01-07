import { Injectable, Injector, Optional, isString, promisify } from '@tsdi/ioc';
import {
    IDuplexStream, ResponseEventFactory, TransportOpts, TransportRequest,
    IncomingAdapter, OutgoingAdapter, StatusAdapter, StreamAdapter, MimeAdapter, isBuffer
} from '@tsdi/common';
import { ClientEventTransportSession } from './session';
import { ClientTransportSessionFactory } from '../transport/session';
import { RequestEncoder, ResponseDecoder } from '../transport/codings';


/**
 * client duplex transport session.
 */
export class ClientDuplexTransportSession extends ClientEventTransportSession<IDuplexStream> {

    writeMessage(data: any, req: TransportRequest<any>): Promise<void> {
        if(this.streamAdapter.isReadable(data)) return this.streamAdapter.pipeTo(data, this.socket)
        if(isBuffer(data)) return promisify<Buffer, void>(this.socket.write, this.socket)(data);
        if(isString(data)) return promisify<Buffer, void>(this.socket.write, this.socket)(Buffer.from(data));

        return promisify<Buffer, void>(this.socket.write, this.socket)(Buffer.from(JSON.stringify(data)));
    }

    protected getPayload(msg: string | Buffer | Uint8Array): string | Buffer | Uint8Array {
        return msg;
    }

    override async destroy(): Promise<void> {
        this.socket.destroy?.();
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
        @Optional() private mimeAdapter: MimeAdapter,
        private streamAdapter: StreamAdapter,
        private eventFactory: ResponseEventFactory,
        private encoder: RequestEncoder,
        private decoder: ResponseDecoder) { }

    create(socket: IDuplexStream, options: TransportOpts): ClientDuplexTransportSession {
        return new ClientDuplexTransportSession(
            this.injector,
            socket,
            this.statusAdapter,
            this.incomingAdapter,
            this.outgoingAdapter,
            this.mimeAdapter,
            this.streamAdapter,
            this.eventFactory,
            this.encoder,
            this.decoder,
            options);
    }

}
