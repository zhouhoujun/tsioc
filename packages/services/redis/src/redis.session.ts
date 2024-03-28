import { Injectable, Injector, isString } from '@tsdi/ioc';
import { BadRequestExecption, Packet, ResponsePacket, StreamAdapter, TransportOpts, ev } from '@tsdi/common/transport';
import { RequestContext, TransportSession, TransportSessionFactory } from '@tsdi/endpoints';
import { Observable, filter, first, fromEvent, map, merge } from 'rxjs';
import Redis from 'ioredis';
import { Encoder, Decoder } from '@tsdi/common';


export interface ReidsTransport {
    publisher: Redis;
    subscriber: Redis;
}

const PATTERN_MSG_BUFFER = 'pmessageBuffer';

export class RedisTransportSession extends TransportSession<ReidsTransport, TopicMessage> {
    get socket(): ReidsTransport {
        throw new Error('Method not implemented.');
    }
    get options(): TransportOpts {
        throw new Error('Method not implemented.');
    }
    get encodings(): Encoder<any, any>[] {
        throw new Error('Method not implemented.');
    }
    get decodings(): Decoder<any, any>[] {
        throw new Error('Method not implemented.');
    }
    sendMessage(data: RequestContext<any, any>, msg: TopicMessage): Observable<TopicMessage> {
        throw new Error('Method not implemented.');
    }
    handMessage(): Observable<TopicMessage> {
        throw new Error('Method not implemented.');
    }

    // private regTopics: Set<string> = new Set();

    // protected async write(data: Buffer, packet: Packet): Promise<void> {

    //     const opts = this.options;
    //     const topic = opts.serverSide ? this.getReply(packet) : packet.topic;
    //     if (!topic || !data) throw new BadRequestExecption();

    //     await this.socket.publisher.publish(topic, data)
    // }

    // protected override async beforeRequest(packet: RequestPacket<any>): Promise<void> {
    //     if (!this.options.serverSide) {
    //         const rtopic = packet.replyTo = this.getReply(packet);
    //         await this.subscribe(rtopic)
    //     }
    // }


    // async subscribe(topic: string): Promise<void> {
    //     if (topic && !this.regTopics.has(topic)) {
    //         this.regTopics.add(topic);
    //         await this.socket.subscriber.subscribe(topic)
    //     }
    // }

    // protected mergeClose(source: Observable<any>): Observable<any> {
    //     const close$ = fromEvent(this.socket.publisher, ev.CLOSE).pipe(
    //         map(err => {
    //             throw err
    //         }));
    //     const error$ = fromEvent(this.socket.publisher, ev.ERROR).pipe(
    //         map(err => {
    //             throw err
    //         }));

    //     return merge(source, close$, error$).pipe(first());
    // }

    // protected override responseFilter(req: RequestPacket<any>, msg: TopicMessage): boolean {
    //     return req.replyTo === msg.topic
    // }

    // protected override responsePacketFilter(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
    //     return req.id === res.id;
    // }

    // protected override message() {
    //     return merge(
    //         fromEvent(this.socket.subscriber, ev.MESSAGE_BUFFER, (topic: string | Buffer, payload: string | Buffer) => {
    //             return { topic: isString(topic) ? topic : new TextDecoder().decode(topic), payload }
    //         }),
    //         fromEvent(this.socket.subscriber, PATTERN_MSG_BUFFER, (pattern: string, topic: string | Buffer, payload: string | Buffer) => {
    //             return { topic: isString(topic) ? topic : new TextDecoder().decode(topic), payload }
    //         })
    //     ).pipe(
    //         filter(msg => this.options.serverSide ? !msg.topic.endsWith('.reply') : true)
    //     )
    // }

    // protected override serialable(packet: Packet<any>): Packet<any> {
    //     const { topic, ...data } = packet;
    //     return data;
    // }


    // protected override getTopic(msg: TopicMessage): string {
    //     return msg.topic
    // }
    // protected override getPayload(msg: TopicMessage): string | Buffer | Uint8Array {
    //     return msg.payload
    // }


    // protected override afterDecode(ctx: Context<Packet<any>>, pkg: Packet<any>, msg: TopicMessage): Packet<any> {
    //     return {
    //         topic: msg.topic,
    //         ...pkg
    //     }
    // }

    // // protected override encode(packet: Packet<any>): Observable<Buffer> {
    // //     return this.sender.send(this.createContext, packet);
    // // }

    // // protected override decode(msg: TopicMessage): Observable<Packet> {
    // //     const { topic, payload } = msg;
    // //     return this.receiver.receive(this.createContext, payload, topic)
    // //         .pipe(
    // //             map(payload => {
    // //                 return {
    // //                     topic,
    // //                     ...payload
    // //                 } as Packet
    // //             })
    // //         )
    // // }

    // protected getReply(packet: Packet) {
    //     return packet.replyTo ?? packet.topic + '.reply';
    // }

    // async destroy(): Promise<void> {
    //     if (this.regTopics.size) {
    //         await this.socket.subscriber.unsubscribe(...Array.from(this.regTopics.values()))
    //         this.regTopics.clear();
    //     }
    //     this.topics.clear();
    //     this.socket.subscriber?.removeAllListeners();
    //     await this.socket.subscriber?.quit();
    //     this.socket.publisher?.removeAllListeners();
    //     await this.socket.publisher?.quit();
    //     this.socket.publisher = this.socket.subscriber = null!;
    // }
}

@Injectable()
export class RedisTransportSessionFactory implements TransportSessionFactory<ReidsTransport> {

    constructor(
        readonly injector: Injector,
        private streamAdapter: StreamAdapter,
        private encoder: Encoder,
        private decoder: Decoder
    ) { }

    create(socket: ReidsTransport, options: TransportOpts): RedisTransportSession {
        return new RedisTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, options);
    }

}
