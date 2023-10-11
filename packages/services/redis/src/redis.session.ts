import { Injectable, isString } from '@tsdi/ioc';
import { BadRequestExecption, Packet, Receiver, RequestPacket, ResponsePacket, Sender, Transport, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { AbstractTransportSession, TopicMessage } from '@tsdi/endpoints';
import { Observable, filter, first, fromEvent, map, merge } from 'rxjs';
import Redis from 'ioredis';


export interface ReidsTransport {
    publisher: Redis;
    subscriber: Redis;
}

const PATTERN_MSG_BUFFER = 'pmessageBuffer';

export class RedisTransportSession extends AbstractTransportSession<ReidsTransport, TopicMessage> {


    constructor(
        socket: ReidsTransport,
        sender: Sender,
        receiver: Receiver,
        options?: TransportOpts) {
        super(socket, sender, receiver, options)
    }

    private topics: Set<string> = new Set();

    protected async write(data: Buffer, packet: Packet): Promise<void> {

        const opts = this.options;
        const topic = opts.serverSide ? this.getReply(packet) : packet.topic;
        if (!topic) throw new BadRequestExecption();

        await this.socket.publisher.publish(topic, data ?? Buffer.alloc(0))
    }

    protected override async beforeRequest(packet: RequestPacket<any>): Promise<void> {
        if (!this.options.serverSide) {
            const rtopic = packet.replyTo = this.getReply(packet);
            await this.subscribe(rtopic)
        }
    }


    async subscribe(topic: string): Promise<void> {
        if (topic && !this.topics.has(topic)) {
            this.topics.add(topic);
            await this.socket.subscriber.subscribe(topic)
        }
    }

    protected mergeClose(source: Observable<any>): Observable<any> {
        const close$ = fromEvent(this.socket.publisher, ev.CLOSE).pipe(
            map(err => {
                throw err
            }));
        const error$ = fromEvent(this.socket.publisher, ev.ERROR).pipe(
            map(err => {
                throw err
            }));

        return merge(source, close$, error$).pipe(first());
    }

    protected reqMsgFilter(req: RequestPacket<any>, msg: TopicMessage): boolean {
        return req.replyTo === msg.topic
    }

    protected override reqResFilter(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return req.id === res.id;
    }

    protected override message() {
        return merge(
            fromEvent(this.socket.subscriber, ev.MESSAGE_BUFFER, (topic: string | Buffer, payload: string | Buffer) => {
                return { topic: isString(topic) ? topic : new TextDecoder().decode(topic), payload }
            }),
            fromEvent(this.socket.subscriber, PATTERN_MSG_BUFFER, (pattern: string, topic: string | Buffer, payload: string | Buffer) => {
                return { topic: isString(topic) ? topic : new TextDecoder().decode(topic), payload }
            })
        ).pipe(
            filter(msg => this.options.serverSide ? !msg.topic.endsWith('.reply') : true)
        )
    }

    protected override pack(packet: Packet<any>): Observable<Buffer> {
        const { topic, ...data } = packet;
        return this.sender.send(data);
    }

    protected override unpack(msg: TopicMessage): Observable<Packet> {
        const { topic, payload } = msg;
        return this.receiver.receive(payload)
            .pipe(
                map(payload => {
                    return {
                        topic,
                        ...payload
                    } as Packet
                })
            )
    }

    protected getReply(packet: Packet) {
        return packet.replyTo ?? packet.topic + '.reply';
    }

    async destroy(): Promise<void> {
        if (this.topics.size) {
            await this.socket.subscriber.unsubscribe(...Array.from(this.topics.values()))
            this.topics.clear();
        }
        this.socket.subscriber?.removeAllListeners();
        await this.socket.subscriber?.quit();
        this.socket.publisher?.removeAllListeners();
        await this.socket.publisher?.quit();
        this.socket.publisher = this.socket.subscriber = null!;
    }
}

@Injectable()
export class RedisTransportSessionFactory implements TransportSessionFactory<ReidsTransport> {

    constructor(private factory: TransportFactory) { }

    create(socket: ReidsTransport, transport: Transport, options?: TransportOpts): RedisTransportSession {
        return new RedisTransportSession(socket, this.factory.createSender(transport, options), this.factory.createReceiver(transport, options), options);
    }

}
