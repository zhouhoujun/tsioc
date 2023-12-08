import { Injectable, Injector, Optional, promisify } from '@tsdi/ioc';
import {
    BadRequestExecption, IReadableStream, IncomingAdapter, MimeAdapter, OutgoingAdapter,
    Packet, PacketBuffer, RequestPacket, ResponseEventFactory, StatusAdapter,
    StreamAdapter, TopicClient, TopicMessage, TransportOpts, TransportRequest
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
    protected writeHeader(req: TransportRequest<any>): Promise<void> {
        const pkg = this.generatePacket(req);
        if (!pkg.topic) throw new BadRequestExecption();
        return promisify<string, Buffer, void>(this.socket.publish, this.socket)(pkg.topic, this.serialize(pkg));
    }
    protected pipe(ata: IReadableStream, req: TransportRequest<any>): Promise<void> {
        throw new Error('Method not implemented.');
    }
    writeMessage(data: Buffer, req: TransportRequest): Promise<void> {
        const pkg = this.generatePacket(req);
        if (!pkg.topic) throw new BadRequestExecption();
        return promisify<string, Buffer, void>(this.socket.publish, this.socket)(pkg.topic, data)
    }
    protected async beforeRequest(packet: TransportRequest<any>): Promise<void> {
        const rtopic = this.getReply(packet);
        if (!this.replys.has(rtopic)) {
            this.replys.add(rtopic);
            this.socket.subscribe(rtopic);
        }
    }


    protected override setPacketPattern(pkg: RequestPacket<any>, req: TransportRequest<any>): void {
        pkg.topic = req.urlWithParams
    }


    protected getReply(packet: Packet) {
        return packet.replyTo || packet.topic + '/reply';
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
            new PacketBuffer(),
            options);
    }

}