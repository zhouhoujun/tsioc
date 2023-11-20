import { promisify } from '@tsdi/ioc';
import { BadRequestExecption, IReadableStream, Packet, RequestPacket, TopicClient, TopicMessage, TransportRequest } from '@tsdi/common';
import { ClientEventTransportSession } from './session';



export class ClientTopicTransportSession<TSocket extends TopicClient> extends ClientEventTransportSession<TSocket, TopicMessage> {

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
