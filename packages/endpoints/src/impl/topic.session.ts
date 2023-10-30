import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { BadRequestExecption, Decoder, Encoder, IEventEmitter, Packet, RequestPacket, ResponsePacket, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { Observable, filter, fromEvent } from 'rxjs';
import { EventTransportSession } from '../transport.session';


export interface TopicClient extends IEventEmitter {
    subscribe(topics: string | string[]): void;
    publish(topic: string, data: Buffer, callback?: (err: any, res: any) => void): void;
    publish(topic: string, data: Buffer, opts: any, callback?: (err: any, res: any) => void): void;
    unsubscribe?(topics: string | string[], callback: (err: any, res: any) => void): void
}

export interface TopicMessage {
    topic: string,
    payload: string | Buffer | Uint8Array
}

export class TopicTransportSession<TSocket extends TopicClient = TopicClient> extends EventTransportSession<TSocket, TopicMessage> {
    
    protected getTopic(msg: TopicMessage): string {
        return msg.topic
    }
    protected getPayload(msg: TopicMessage): string | Buffer | Uint8Array {
        return msg.payload
    }

    private replys: Set<string> = new Set();

    protected async write(data: Buffer, packet: Packet<any>): Promise<void> {
        const topic = this.options.serverSide ? this.getReply(packet) : packet.topic;
        if (!topic) throw new BadRequestExecption();
        await promisify(this.socket.publish, this.socket)(topic, data)
    }

    protected override async beforeRequest(packet: RequestPacket<any>): Promise<void> {
        if (!this.options.serverSide) {
            const rtopic = this.getReply(packet);
            if (!this.replys.has(rtopic)) {
                this.replys.add(rtopic);
                this.socket.subscribe(rtopic);
            }
        }
    }

    protected override message(): Observable<any> {
        return fromEvent(this.socket, ev.MESSAGE, (topic: string, payload) => ({ topic, payload })).pipe(
            filter(res => this.options.serverSide ? !res.topic.endsWith('/reply') : true),
        ) as Observable<any>;
    }

    protected override responseFilter(req: RequestPacket<any>, msg: TopicMessage): boolean {
        return this.getReply(req) == msg.topic;
    }

    protected override responsePacketFilter(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return req.id === res.id;
    }

    protected getReply(packet: Packet) {
        return packet.replyTo || packet.topic + '/reply';
    }

    async destroy(): Promise<void> {
        if (this.replys.size && this.socket.unsubscribe) {
            await promisify(this.socket.unsubscribe, this.socket)(Array.from(this.replys.values()));
            this.replys.clear();
        }
    }
}

@Injectable()
export class TopicTransportSessionFactory implements TransportSessionFactory<TopicClient> {

    constructor(readonly injector: Injector, private encoder: Encoder, private decoder: Decoder) { }

    create(socket: TopicClient, options: TransportOpts): TopicTransportSession {
        return new TopicTransportSession(this.injector, socket, this.encoder, this.decoder, options);
    }

}
