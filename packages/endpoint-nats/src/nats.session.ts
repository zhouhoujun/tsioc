import { BadRequestExecption, Packet, RequestPacket, ResponsePacket, Transport, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { Injectable, promisify } from '@tsdi/ioc';
import { Msg, MsgHdrs, NatsConnection, headers as createHeaders } from 'nats';
import { filter, fromEvent, map } from 'rxjs';
import { NatsSessionOpts } from './options';


export class TopicTransportSession extends AbstractTransportSession<NatsConnection> {

    private replys: Set<string> = new Set();

    protected async write(data: Buffer, packet: Packet & { natsheaders: MsgHdrs }): Promise<void> {
        const topic = this.options.serverSide ? this.getReply(packet) : packet.topic;
        const opts = this.options as NatsSessionOpts;
        if (!topic) throw new BadRequestExecption();
        if(!packet.natsheaders){
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
            if (!this.replys.has(rtopic)) {
                this.replys.add(rtopic);
                this.socket.subscribe(rtopic);
            }
        }
    }

    protected bindDataEvent() {
        this.subs.add(fromEvent(this.socket, this.getMessageEvent(), (topic: string, message) => {
            return { topic, message };
        }).pipe(
            filter(res => this.options.serverSide ? !res.topic.endsWith('/reply') : true),
            map(res => {
                return res.message
            })
        ).subscribe(data => this.receiver.receive(data)))
    }

    protected override match(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return this.getReply(req) == res.topic && req.id === res.id;
    }

    protected getReply(packet: Packet) {
        return packet.replyTo ?? packet.topic + '/reply';
    }

    protected override getMessageEvent(): string {
        return ev.MESSAGE;
    }

    async destroy(): Promise<void> {
        this.subs?.unsubscribe();
        if(this.replys.size){
            this.replys.clear();
        }
    }
}

@Injectable()
export class NatsTransportSessionFactory implements TransportSessionFactory<NatsConnection> {

    constructor(private factory: TransportFactory) { }

    create(socket: NatsConnection, transport: Transport, options?: TransportOpts): TopicTransportSession {
        return new TopicTransportSession(socket, this.factory.createSender(transport, options), this.factory.createReceiver(transport, options), options);
    }

}
