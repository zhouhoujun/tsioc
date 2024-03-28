import { Injectable, Injector } from '@tsdi/ioc';
import { BadRequestExecption, HeaderPacket, OfflineExecption, Packet, ResponsePacket, StreamAdapter, TransportOpts, ev } from '@tsdi/common/transport';
import { TransportSession, TransportSessionFactory } from '@tsdi/endpoints';
import { EventEmitter } from 'events';
import { Msg, MsgHdrs, NatsConnection, SubscriptionOptions, headers as createHeaders, Subscription } from 'nats';
import { Observable, filter, fromEvent, map, of, throwError } from 'rxjs';
import { NatsSessionOpts } from './options';


export class NatsTransportSession extends TransportSession<NatsConnection, Msg> {

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

    protected override async beforeRequest(packet: RequestPacket<any>): Promise<void> {
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

    protected override responseFilter(req: RequestPacket<any>, msg: Msg): boolean {
        return req.replyTo === msg.subject
    }

    protected override responsePacketFilter(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
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


    protected getHeaders(msg: Msg): HeaderPacket | undefined {
        const headers = {} as OutgoingHeaders;
        msg.headers?.keys().forEach(key => {
            headers[key] = msg.headers?.get(key);
        });
        const id = msg.headers?.get(hdr.IDENTITY) ?? msg.sid;
        return {
            id,
            topic: msg.subject,
            replyTo: msg.reply,
            headers
        };
    }
    
    protected concat(msg: Msg): Observable<Buffer> {
        return of(Buffer.from(msg.data))
    }

    protected override afterDecode(ctx: Context<Packet<any>>, pkg: Packet<any>, msg: Msg): Packet<any> {
        return {
            ...ctx.headers,
            ...pkg
        }
    }

    protected getReply(packet: Packet) {
        return packet.replyTo ?? packet.topic + '.reply';
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

    constructor(readonly injector: Injector) { }


    create(injector: Injector, socket: NatsConnection, options: TransportOpts): TransportSession<NatsConnection, any> {
        throw new Error('Method not implemented.');
    }

    // create(socket: NatsConnection, options: TransportOpts): NatsTransportSession {
    //     return new NatsTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, options);
    // }

}
