import { Execption, Injectable, isArray, isNil, isNumber, isString } from '@tsdi/ioc';
import { UuidGenerator } from '@tsdi/core';
import { BadRequestExecption, IncomingHeaders, NotFoundExecption, OfflineExecption, OutgoingHeaders, Packet, Receiver, RequestPacket, ResponsePacket, Sender, Transport, TransportFactory, TransportOpts, TransportSessionFactory, ev, hdr, isBuffer } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { EventEmitter } from 'events';
import { Observable, filter, fromEvent, map, throwError } from 'rxjs';
import { AssignerProtocol, Cluster, ConsumerRunConfig, EachMessagePayload, GroupMember, GroupMemberAssignment, GroupState, MemberMetadata, ConsumerSubscribeTopics, ProducerRecord, IHeaders } from 'kafkajs';
import { KafkaHeaders, KafkaTransport } from './const';


export interface KafkaTransportOpts extends TransportOpts, ConsumerRunConfig {
    subscribe?: Omit<ConsumerSubscribeTopics, 'topic'>;
    run?: Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'>;
    send?: Omit<ProducerRecord, 'topic' | 'messages'>;
    consumerAssignments?: { [key: string]: number };
}

export class NatsTransportSession extends AbstractTransportSession<KafkaTransport, EachMessagePayload> {


    private regTopics?: RegExp[];
    private events = new EventEmitter();

    constructor(
        socket: KafkaTransport,
        sender: Sender,
        receiver: Receiver,
        private uuidGenner: UuidGenerator,
        options?: KafkaTransportOpts) {
        super(socket, sender, receiver, options)
    }


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
        
        const headers: IHeaders = {};
        Object.keys(packet.headers!).forEach(k => {
            headers[k] = this.generHead(packet.headers![k]);
        });
        headers[KafkaHeaders.CORRELATION_ID] = `${packet.id}`;
        if (!opts.serverSide) {
            const replyTopic = this.getReply(packet);
            headers[KafkaHeaders.REPLY_TOPIC] = Buffer.from(replyTopic);
            if (opts.consumerAssignments && !isNil(opts.consumerAssignments[replyTopic])) {
                headers[KafkaHeaders.REPLY_PARTITION] = Buffer.from(opts.consumerAssignments[replyTopic].toString());
            } else if (!this.regTopics?.some(i => i.test(replyTopic))) {
                throw new NotFoundExecption(replyTopic + ' has not registered.', this.socket.vaildator.notFound);
            }
        }

        this.socket.producer.send({
            ...opts.send,
            topic,
            messages: [{
                headers: packet.kafkaheaders,
                value: data ?? Buffer.alloc(0),
                partition: packet.partition
            }]
        })
            // .then(() => callback?.())
            // .catch(err => {
            //     this.handleFailed(err);
            //     callback?.(err)
            // })
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

    protected override initRequest(packet: RequestPacket<any>): void {
        super.initRequest(packet);
        if (!this.options.serverSide) {
            const rtopic = packet.replyTo = this.getReply(packet);
            this.subscribe(rtopic, (this.options as KafkaTransport).subscriptionOpts)
        }
    }



    protected mergeClose(source: Observable<any>): Observable<any> {
        return this.socket.isClosed() ? throwError(() => new OfflineExecption()) : source;
    }

    protected reqMsgFilter(req: RequestPacket<any>, msg: EachMessagePayload): boolean {
        return req.replyTo === msg.topic
    }

    protected override reqResFilter(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return req.id === res.id;
    }

    protected override message() {
        return fromEvent(this.events, ev.MESSAGE, (msg: EachMessagePayload) => {
            return msg
        }).pipe(
            filter(msg => this.options.serverSide ? !msg.topic.endsWith('.reply') : true)
        )
    }

    protected override pack(packet: Packet<any>): Observable<Buffer> {
        const { replyTo, topic, id, headers, ...data } = packet;
        return this.sender.send(data);
    }

    protected override unpack(msg: EachMessagePayload): Observable<Packet> {
        const headers = this.getIncomingHeaders(msg);
        const id = headers[KafkaHeaders.CORRELATION_ID];
        return this.receiver.receive(msg.message.value ?? Buffer.alloc(0))
            .pipe(
                map(payload => {
                    return {
                        id,
                        topic: msg.topic,
                        replyTo: msg.partition,
                        headers,
                        ...payload
                    } as Packet
                })
            )
    }

    protected getReply(packet: Packet) {
        return packet.replyTo ?? packet.topic + '.reply';
    }

    protected override getPacketId(): string {
        return this.uuidGenner.generate()
    }

    async destroy(): Promise<void> {
    }
}

@Injectable()
export class NatsTransportSessionFactory implements TransportSessionFactory<NatsConnection> {

    constructor(private factory: TransportFactory,
        private uuidGenner: UuidGenerator) { }

    create(socket: NatsConnection, transport: Transport, options?: TransportOpts): NatsTransportSession {
        return new NatsTransportSession(socket, this.factory.createSender(transport, options), this.factory.createReceiver(transport, options), this.uuidGenner, options);
    }

}
