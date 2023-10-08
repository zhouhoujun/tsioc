import { Injectable, promisify } from '@tsdi/ioc';
import { BadRequestExecption, IEventEmitter, Packet, RequestPacket, ResponsePacket, Transport, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { Observable, filter, fromEvent, map } from 'rxjs';
import { AbstractTransportSession } from '../transport.session';


export interface TopicClient extends IEventEmitter {
    subscribe(topics: string | string[]): void;
    publish(topic: string, data: Buffer, callback?: (err: any, res: any) => void): void;
    publish(topic: string, data: Buffer, opts: any, callback?: (err: any, res: any) => void): void;
    unsubscribe?(topics: string | string[], callback: (err: any, res: any) => void): void
}


export class TopicTransportSession<TSocket extends TopicClient = TopicClient> extends AbstractTransportSession<TSocket> {

    private replys: Set<string> = new Set();

    protected async write(data: Buffer, packet: Packet<any>): Promise<void> {
        const topic = this.options.serverSide ? this.getReply(packet) : packet.topic;
        if (!topic) throw new BadRequestExecption();
        await promisify(this.socket.publish, this.socket)(topic, data)
    }

    protected override initRequest(packet: RequestPacket<any>): void {
        super.initRequest(packet);
        this.subscribeReply(packet);
    }

    protected subscribeReply(packet: RequestPacket<any>): void {
        if (!this.options.serverSide) {
            const rtopic = this.getReply(packet);
            if (!this.replys.has(rtopic)) {
                this.replys.add(rtopic);
                this.socket.subscribe(rtopic);
            }
        }
    }

    protected override messageEvent(): Observable<any> {
        return fromEvent(this.socket, ev.MESSAGE, (topic: string, message) => ({ topic, message })).pipe(
            filter(res => this.options.serverSide ? !res.topic.endsWith('/reply') : true),
            map(res => {
                return res.message
            })
        ) as Observable<any>;
    }

    protected override match(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return req.topic == res.topic && req.id === res.id;
    }

    protected getReply(packet: Packet) {
        return packet.replyTo ?? packet.topic + '/reply';
    }

    async destroy(): Promise<void> {
        this.subs?.unsubscribe();
        if (this.replys.size && this.socket.unsubscribe) {
            await promisify(this.socket.unsubscribe, this.socket)(Array.from(this.replys.values()));
            this.replys.clear();
        }
    }
}

@Injectable()
export class TopicTransportSessionFactory implements TransportSessionFactory<TopicClient> {

    constructor(private factory: TransportFactory) { }

    create(socket: TopicClient, transport: Transport, options?: TransportOpts): TopicTransportSession {
        return new TopicTransportSession(socket, this.factory.createSender(transport, options), this.factory.createReceiver(transport, options), options);
    }

}
