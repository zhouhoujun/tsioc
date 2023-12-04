import { Injectable, Injector, Optional, promisify } from '@tsdi/ioc';
import { BadRequestExecption, IReadableStream, Packet, PacketBuffer, ResponsePacket, StatusVaildator, StreamAdapter, TopicClient, TopicMessage, TransportOpts, ev } from '@tsdi/common';
import { Observable, filter, fromEvent } from 'rxjs';
import { ServerEventTransportSession } from './transport.session';
import { IncomingDecoder, OutgoingEncoder } from '../transport/codings';
import { ServerTransportSessionFactory } from '../transport/session';
import { TransportContext } from '../TransportContext';



export class TopicTransportSession<TSocket extends TopicClient = TopicClient> extends ServerEventTransportSession<TSocket, TopicMessage> {
    protected writeHeader(ctx: TransportContext<any, any, any>): Promise<void> {
        const headBuff = this.serialize(ctx);
        return promisify<string, Buffer, void>(this.socket.publish, this.socket)(ctx.response.replyTo, headBuff);
    }
    protected pipe(data: IReadableStream, ctx: TransportContext<any, any, any>): Promise<void> {
        throw new Error('Method not implemented.');
    }

    protected getTopic(msg: TopicMessage): string {
        return msg.topic
    }
    protected getPayload(msg: TopicMessage): string | Buffer | Uint8Array {
        return msg.payload
    }

    private replys: Set<string> = new Set();

    async writeMessage(chunk: Buffer, ctx: TransportContext): Promise<void> {
        const packet = this.generatePacket(ctx, true);
        const topic = this.options.serverSide ? this.getReply(packet) : packet.topic;
        if (!topic) throw new BadRequestExecption();
        await promisify(this.socket.publish, this.socket)(topic, chunk)
    }

    override write(packet: ResponsePacket, chunk: Buffer, callback?: (err?: any) => void): void {
        const topic = this.options.serverSide ? this.getReply(packet) : packet.topic;
        if (!topic) throw new BadRequestExecption();
        this.socket.publish(topic, chunk, callback)
    }

    protected override message(): Observable<any> {
        return fromEvent(this.socket, ev.MESSAGE, (topic: string, payload) => ({ topic, payload })).pipe(
            filter(res => this.options.serverSide ? !res.topic.endsWith('/reply') : true),
        ) as Observable<any>;
    }

    protected getReply(packet: Packet) {
        return packet.replyTo || packet.topic + '/reply';
    }

    async destroy(): Promise<void> {
        if (this.replys.size && this.socket.unsubscribe) {
            await promisify(this.socket.unsubscribe, this.socket)(Array.from(this.replys.values()));
            this.replys.clear();
        }
        this.packetBuffer.clear();
    }
}

@Injectable()
export class TopicTransportSessionFactory implements ServerTransportSessionFactory<TopicClient> {

    constructor(
        readonly injector: Injector,
        @Optional() private statusVaildator: StatusVaildator,
        private streamAdapter: StreamAdapter,
        private encoder: OutgoingEncoder,
        private decoder: IncomingDecoder) { }

    create(socket: TopicClient, options: TransportOpts): TopicTransportSession {
        return new TopicTransportSession(this.injector, socket, this.statusVaildator, this.streamAdapter, this.encoder, this.decoder, new PacketBuffer(), options);
    }

}
