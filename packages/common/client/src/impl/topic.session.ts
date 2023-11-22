import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { BadRequestExecption, IReadableStream, Packet, PacketBuffer, RequestPacket, StreamAdapter, TopicClient, TopicMessage, TransportOpts, TransportRequest } from '@tsdi/common';
import { ClientEventTransportSession } from './session';
import { ClientTransportSessionFactory } from '../transport/session';
import { RequestEncoder, ResponseDecoder } from '../transport/codings';



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
    write(data: Buffer, req: TransportRequest): Promise<void> {
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


@Injectable()
export class ClientTopicTransportSessionFactory implements ClientTransportSessionFactory<TopicClient> {

    constructor(
        readonly injector: Injector,
        private streamAdapter: StreamAdapter,
        private encoder: RequestEncoder,
        private decoder: ResponseDecoder) { }

    create(socket: TopicClient, options: TransportOpts): ClientTopicTransportSession<TopicClient> {
        return new ClientTopicTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, new PacketBuffer(), options);
    }

}