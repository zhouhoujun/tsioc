import { Injectable } from '@tsdi/ioc';
import { UuidGenerator } from '@tsdi/core';
import { BadRequestExecption, OfflineExecption, OutgoingHeaders, Packet, Receiver, RequestPacket, ResponsePacket, Sender, Transport, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { hdr } from '@tsdi/endpoints/assets';
import { EventEmitter } from 'events';
import { Msg, MsgHdrs, NatsConnection, SubscriptionOptions, headers as createHeaders, Subscription } from 'nats';
import { Observable, filter, fromEvent, map, throwError } from 'rxjs';
import { NatsSessionOpts } from './options';


export class NatsTransportSession extends AbstractTransportSession<NatsConnection, Msg> {


    constructor(
        socket: NatsConnection,
        sender: Sender,
        receiver: Receiver,
        private uuidGenner: UuidGenerator,
        options?: TransportOpts) {
        super(socket, sender, receiver, options)
    }

    private subjects: Set<string> = new Set();
    private events = new EventEmitter();
    private subscribes: Subscription[] | null = [];

    protected async write(data: Buffer, packet: Packet & { natsheaders: MsgHdrs }): Promise<void> {

        const opts = this.options as NatsSessionOpts;
        const topic = opts.serverSide ? this.getReply(packet) : packet.topic;
        if (!topic) throw new BadRequestExecption();
        // if (!packet.natsheaders) {
        const headers = createHeaders();
        opts.publishOpts?.headers && opts.publishOpts.headers.keys().forEach(k => {
            headers.set(k, opts.publishOpts?.headers?.get(k) ?? '')
        })
        packet.headers && Object.keys(packet.headers).forEach(k => {
            headers.set(k, String(packet?.headers?.[k] ?? ''))
        });

        headers.set(hdr.IDENTITY, packet.id);
        // packet.natsheaders = headers;
        // }

        const replys = opts.serverSide ? undefined : {
            reply: packet.replyTo
        };

        this.socket.publish(
            topic,
            data ?? Buffer.alloc(0),
            {
                ...opts.publishOpts,
                ...replys,
                headers
            })
    }

    protected override initRequest(packet: RequestPacket<any>): void {
        super.initRequest(packet);
        if (!this.options.serverSide) {
            const rtopic = packet.replyTo = this.getReply(packet);
            this.subscribe(rtopic, (this.options as NatsSessionOpts).subscriptionOpts)
        }
    }


    subscribe(subject: string, opts?: SubscriptionOptions) {
        if (subject && !this.subjects.has(subject)) {
            this.subjects.add(subject);
            this.subscribes?.push(this.socket.subscribe(subject, {
                ...opts,
                callback: (err: any, msg: Msg) => {
                    this.events.emit(ev.MESSAGE, err, msg);
                }
            }));
        }
    }

    protected mergeClose(source: Observable<any>): Observable<any> {
        return this.socket.isClosed() ? throwError(() => new OfflineExecption()) : source;
    }

    protected reqMsgFilter(req: RequestPacket<any>, msg: Msg): boolean {
        return req.replyTo === msg.subject
    }

    protected override reqResFilter(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return req.id === res.id;
    }

    protected override message() {
        return fromEvent(this.events, ev.MESSAGE, (error: Error, msg: Msg) => {
            return { error, msg }
        }).pipe(
            map(res => {
                if (res.error) throw res.error;
                return res.msg
            }),
            filter(msg => this.options.serverSide ? !(!msg.reply || msg.subject.endsWith('.reply')) : true)
        )
    }

    protected override pack(packet: Packet<any>): Observable<Buffer> {
        const { replyTo, topic, id, headers, ...data } = packet;
        return this.sender.send(data);
    }

    protected override unpack(msg: Msg): Observable<Packet> {
        const headers = {} as OutgoingHeaders;
        msg.headers?.keys().forEach(key => {
            headers[key] = msg.headers?.get(key);
        });
        const id = msg.headers?.get(hdr.IDENTITY) ?? msg.sid;
        return this.receiver.receive(msg.data)
            .pipe(
                map(payload => {
                    return {
                        id,
                        topic: msg.subject,
                        replyTo: msg.reply,
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
        if (this.subjects.size) {
            this.subjects.clear();
        }
        this.subscribes?.forEach(s => s?.unsubscribe());
        this.subscribes = null;
        this.events.removeAllListeners();
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
