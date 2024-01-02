import { Injectable, Injector, Optional, isString, promisify } from '@tsdi/ioc';
import { BadRequestExecption, FileAdapter, IReadableStream, IncomingAdapter, MimeAdapter, OutgoingAdapter, Packet, PacketBuffer, ResponsePacket, StatusAdapter, StreamAdapter, TopicClient, TopicMessage, TransportOpts, ev, isBuffer, toBuffer } from '@tsdi/common';
import { Observable, filter, fromEvent } from 'rxjs';
import { ServerEventTransportSession } from './transport.session';
import { IncomingDecoder, OutgoingEncoder } from '../transport/codings';
import { ServerTransportSessionFactory } from '../transport/session';
import { TransportContext } from '../TransportContext';



export class TopicTransportSession<TSocket extends TopicClient = TopicClient> extends ServerEventTransportSession<TSocket, TopicMessage> {
    
    topic = true;

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

    override writeMessage(data: TopicMessage, ctx: TransportContext): Promise<any> {
        const topic = this.options.serverSide ? this.getReply(data) : data.topic;
        if (!topic) throw new BadRequestExecption();

        
        if(this.streamAdapter.isReadable(data)) {
            return toBuffer(data)
                .then(buf=> promisify(this.socket.publish, this.socket)(topic, buf));
        }

        if(isBuffer(data)) return promisify(this.socket.publish, this.socket)(topic,data);
        if(isString(data)) return promisify(this.socket.publish, this.socket)(topic, Buffer.from(data));

        return promisify(this.socket.publish, this.socket)(topic, Buffer.from(JSON.stringify(data)))
    }

    // override write(packet: ResponsePacket, chunk: Buffer, callback?: (err?: any) => void): void {
    //     const topic = this.options.serverSide ? this.getReply(packet) : packet.topic;
    //     if (!topic) throw new BadRequestExecption();
    //     this.socket.publish(topic, chunk, callback)
    // }

    protected override message(): Observable<any> {
        return fromEvent(this.socket, ev.MESSAGE, (topic: string, payload) => ({ topic, payload })).pipe(
            filter(res => this.options.serverSide ? !res.topic.endsWith('/reply') : true),
        ) as Observable<any>;
    }

    protected getReply(msg: TopicMessage) {
        return msg.replyTo || msg.topic + '/reply';
    }

    async destroy(): Promise<void> {
        if (this.replys.size && this.socket.unsubscribe) {
            await promisify(this.socket.unsubscribe, this.socket)(Array.from(this.replys.values()));
            this.replys.clear();
        }
        // this.packetBuffer.clear();
    }
}

@Injectable()
export class TopicTransportSessionFactory implements ServerTransportSessionFactory<TopicClient> {

    constructor(
        readonly injector: Injector,
        @Optional() private statusAdapter: StatusAdapter,
        @Optional() private incomingAdapter: IncomingAdapter,
        @Optional() private outgoingAdapter: OutgoingAdapter,
        @Optional() private mimeAdapter: MimeAdapter,
        private fileAdapter: FileAdapter,
        private streamAdapter: StreamAdapter,
        private encoder: OutgoingEncoder,
        private decoder: IncomingDecoder) { }

    create(socket: TopicClient, options: TransportOpts): TopicTransportSession {
        return new TopicTransportSession(
            this.injector,
            socket,
            this.statusAdapter,
            this.incomingAdapter,
            this.outgoingAdapter,
            this.mimeAdapter,
            this.fileAdapter,
            this.streamAdapter,
            this.encoder,
            this.decoder,
            options);
    }

}
