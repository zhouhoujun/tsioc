import { BadRequestExecption, OfflineExecption, OutgoingHeaders, Packet, Receiver, RequestPacket, ResponsePacket, Sender, Transport, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { hdr } from '@tsdi/endpoints/assets';
import { Injectable } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { Msg, MsgHdrs, NatsConnection, SubscriptionOptions, headers as createHeaders, Subscription } from 'nats';
import { Observable, filter, fromEvent, map, throwError } from 'rxjs';
import { NatsSessionOpts } from './options';
import { UuidGenerator } from '@tsdi/core';


export class NatsTransportSession extends AbstractTransportSession<NatsConnection> {


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
        const topic = this.options.serverSide ? this.getReply(packet) : packet.topic;
        const opts = this.options as NatsSessionOpts;
        if (!topic) throw new BadRequestExecption();
        if (!packet.natsheaders) {
            const headers = opts.publishOpts?.headers ?? createHeaders();
            packet.headers && Object.keys(packet.headers).forEach(k => {
                headers.set(k, String(packet?.headers?.[k] ?? ''))
            });
            headers.set(hdr.IDENTITY, packet.id);
            packet.natsheaders = headers;
        }

        const replys = this.options.serverSide ? undefined : {
            reply: packet.replyTo
        };
        this.socket.publish(topic, data, {
            ...opts.publishOpts,
            ...replys,
            headers: packet.natsheaders
        })
    }

    protected override initRequest(packet: RequestPacket<any>): void {
        super.initRequest(packet);
        if (!this.options.serverSide) {
            const rtopic = this.getReply(packet);
            this.subscribe(rtopic, (this.options as NatsSessionOpts).subscriptionOpts)
        }
    }


    subscribe(subject: string, opts?: SubscriptionOptions) {
        if (!this.subjects.has(subject)) {
            const opts = this.options as NatsSessionOpts;
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

    protected override match(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return req.topic == res.topic && req.id === res.id;
    }

    protected override message() {
        return fromEvent(this.events, ev.MESSAGE, (error: Error, msg: Msg) => {
            return { error, msg }
        }).pipe(
            map(res => {
                if (res.error) throw res.error;
                return res.msg
            }),
            filter(msg => this.options.serverSide ? !msg.subject.endsWith('.reply') : true)
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
        return this.receiver.receive(Buffer.from(msg.data))
            .pipe(
                map(payload => {
                    return {
                        id,
                        topic: headers[hdr.TOPIC],
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
