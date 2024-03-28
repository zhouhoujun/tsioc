import { Execption, Injectable, Injector, isArray, isNil, isNumber, isString, isUndefined } from '@tsdi/ioc';
import { BadRequestExecption, HeaderPacket, NotFoundExecption, Packet, ResponsePacket, StreamAdapter, TransportOpts, ev, isBuffer } from '@tsdi/common/transport';
import { TransportSession, TransportSessionFactory } from '@tsdi/endpoints';
import { EventEmitter } from 'events';
import { Observable, filter, first, fromEvent, merge, of } from 'rxjs';
import { EachMessagePayload, IHeaders, RemoveInstrumentationEventListener } from 'kafkajs';
import { KafkaHeaders, KafkaTransport, KafkaTransportOpts } from '../const';


export class KafkaTransportSession extends TransportSession<KafkaTransport, EachMessagePayload> {


    private regTopics?: RegExp[];
    private events = new EventEmitter();


    async bindTopics(topics: (string | RegExp)[]) {
        const consumer = this.socket.consumer;
        if (!consumer) throw new Execption('No consumer');
        await consumer.subscribe({
            topics,
            ... (this.options as KafkaTransportOpts).subscribe,
        });

        this.regTopics = topics.filter(t => t instanceof RegExp) as RegExp[];

        await consumer.run({
            // autoCommit: true,
            // autoCommitInterval: 5000,
            // autoCommitThreshold: 100,
            ...(this.options as KafkaTransportOpts).run,
            eachMessage: async (payload) => {
                if (this.options.serverSide && payload.topic.endsWith('.reply')) return;
                this.events.emit(ev.MESSAGE, payload);
            }
        })
    }

    protected async write(data: Buffer, packet: Packet & { partition: number, kafkaheaders: IHeaders }): Promise<void> {

        const opts = this.options as KafkaTransportOpts;
        const topic = opts.serverSide ? this.getReply(packet) : packet.topic;
        if (!topic) throw new BadRequestExecption();
        if (!packet.kafkaheaders) {
            const headers = packet.kafkaheaders = {} as IHeaders;
            packet.headers && Object.keys(packet.headers).forEach(k => {
                headers[k] = this.generHead(packet.headers![k]);
            });
            headers[KafkaHeaders.CORRELATION_ID] = `${packet.id}`;
            if (this.options.serverSide) {
                packet.partition = packet.headers?.[KafkaHeaders.REPLY_PARTITION]
            } else {
                const opts = this.options as KafkaTransportOpts;
                const replyTopic = this.getReply(packet);
                headers[KafkaHeaders.REPLY_TOPIC] = Buffer.from(replyTopic);
                if (opts.consumerAssignments && !isNil(opts.consumerAssignments[replyTopic])) {
                    headers[KafkaHeaders.REPLY_PARTITION] = Buffer.from(opts.consumerAssignments[replyTopic].toString());
                } else if (!this.regTopics?.some(i => i.test(replyTopic))) {
                    throw new NotFoundExecption(replyTopic + ' has not registered.', this.socket.vaildator?.notFound);
                }
            }
        }
        const headers: IHeaders = packet.kafkaheaders;

        await this.socket.producer.send({
            ...opts.send,
            topic,
            messages: [{
                headers,
                value: data ?? Buffer.alloc(0),
                partition: packet.partition
            }]
        })
    }

    protected getIncomingHeaders(msg: EachMessagePayload): IncomingHeaders {
        const headers: IncomingHeaders = {};
        if (msg.message.headers) {
            Object.keys(msg.message.headers).forEach(k => {
                headers[k] = this.parseHead(msg.message.headers![k])
            })
        }
        return headers;
    }

    protected parseHead(val: Buffer | string | (Buffer | string)[] | undefined): string | string[] | undefined {
        if (isString(val)) return val;
        if (isBuffer(val)) return val.toString();
        if (isArray(val)) return val.map(v => isString(v) ? v : v.toString());
        return `${val}`;
    }

    protected generHead(head: string | number | readonly string[] | undefined): Buffer | string | (Buffer | string)[] | undefined {
        if (isNumber(head)) return Buffer.from(head.toString());
        if (isArray(head)) return head.map(v => v.toString())
        return Buffer.from(`${head}`);
    }

    protected override async beforeRequest(packet: RequestPacket<any>): Promise<void> {
        if (!this.options.serverSide) {
            packet.replyTo = this.getReply(packet);
        }
    }



    protected mergeClose(source: Observable<any>): Observable<any> {

        const err$ = new Observable(subscriber => {
            const usubs: RemoveInstrumentationEventListener<any>[] = [];
            usubs.push(this.socket.consumer.on('consumer.network.request_timeout', er => {
                subscriber.error(er);
            }));
            usubs.push(this.socket.producer.on('producer.network.request_timeout', er => {
                subscriber.error(er)
            }));

            usubs.push(this.socket.consumer.on('consumer.disconnect', (e) => {
                subscriber.error(e);
            }))
            usubs.push(this.socket.producer.on('producer.disconnect', (e) => {
                subscriber.error(e);
            }))

            return () => {
                usubs.forEach(e => e?.())
            }
        })

        return merge(source, err$).pipe(first());
    }

    protected override responseFilter(req: RequestPacket<any>, msg: EachMessagePayload): boolean {
        return req.replyTo === msg.topic
    }

    protected override responsePacketFilter(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return req.id === res.id;
    }

    protected override message() {
        return fromEvent(this.events, ev.MESSAGE, (msg: EachMessagePayload) => {
            return msg
        }).pipe(
            filter(msg => this.options.serverSide ? !msg.topic.endsWith('.reply') : true)
        )
    }


    protected override getHeaders(msg: EachMessagePayload): HeaderPacket | undefined {
        const headers = this.getIncomingHeaders(msg);
        const id = headers[KafkaHeaders.CORRELATION_ID];

        return {
            id,
            topic: msg.topic,
            headers
        };
    }

    protected override concat(msg: EachMessagePayload): Observable<Buffer> {
        return of(msg.message.value ?? Buffer.alloc(0))
    }

    protected override afterDecode(ctx: Context<Packet<any>>, pkg: Packet<any>, msg: EachMessagePayload): Packet<any> {
        return {
            ...ctx.headers,
            ...pkg
        }
    }

    protected getReply(packet: Packet) {
        return packet.replyTo || packet.topic + '.reply';
    }

    async destroy(): Promise<void> {
        this.events.removeAllListeners();
    }
}

@Injectable()
export class KafkaTransportSessionFactory implements TransportSessionFactory<KafkaTransport> {

    constructor(
        readonly injector: Injector,
        private streamAdapter: StreamAdapter) { }

    create(socket: KafkaTransport, options: TransportOpts): KafkaTransportSession {
        return new KafkaTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, options);
    }

}

