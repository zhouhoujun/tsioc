import { Injectable, Injector, Optional, isDefined, promisify } from '@tsdi/ioc';
import {
    BadRequestExecption, IncomingAdapter, MimeAdapter, OutgoingAdapter, Packet, RequestPacket, ResponseEventFactory, StatusAdapter,
    StreamAdapter, TopicClient, TopicMessage, TransportOpts, TransportRequest, isBuffer
} from '@tsdi/common';
import { ClientEventTransportSession } from './session';
import { ClientTransportSessionFactory } from '../transport/session';
import { RequestEncoder, ResponseDecoder } from '../transport/codings';


/**
 * Client topic transport session.
 */
export class ClientTopicTransportSession<TSocket extends TopicClient = TopicClient> extends ClientEventTransportSession<TSocket, TopicMessage> {
    
    private replys: Set<string> = new Set();

    protected getTopic(msg: TopicMessage): string {
        return msg.topic
    }
    protected getPayload(msg: TopicMessage): string | Buffer | Uint8Array {
        return msg.payload
    }

    writeMessage(data: TopicMessage, req: TransportRequest): Promise<void> {
        if (!data.topic || !data.payload) throw new BadRequestExecption();
        const payload = isBuffer(data.payload) ? data.payload : Buffer.from(data.payload);
        return promisify<string, Buffer, void>(this.socket.publish, this.socket)(data.topic, payload)
    }
    protected async beforeRequest(packet: TransportRequest<any>): Promise<void> {
        const rtopic = this.getReply(packet);
        if (!this.replys.has(rtopic)) {
            this.replys.add(rtopic);
            this.socket.subscribe(rtopic);
        }
    }

    generatePacket(req: TransportRequest, noPayload?: boolean): Packet<any> {
        const pkg = {
            topic: req.url,
        } as RequestPacket;
        if (req.method) {
            pkg.method = req.method;
        }
        if (req.headers.size) {
            pkg.headers = req.headers.getHeaders()
        }
        if (!noPayload && isDefined(req.body)) {
            pkg.payload = req.body;
        }
        if (req.params.size) {
            pkg.originalUrl = req.urlWithParams;
        }

        return pkg;
    }


    protected getReply(packet: Packet) {
        return packet.replyTo || packet.topic + '/reply';
    }

    async destroy(): Promise<void> {
        this.replys.clear();
    }

}

/**
 * client topic transport factory.
 */
@Injectable()
export class ClientTopicTransportSessionFactory implements ClientTransportSessionFactory<TopicClient> {

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

    create(socket: TopicClient, options: TransportOpts): ClientTopicTransportSession<TopicClient> {
        return new ClientTopicTransportSession(
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