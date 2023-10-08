import { BadRequestExecption, Packet, RequestPacket, ResponsePacket, Transport, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { Injectable, promisify } from '@tsdi/ioc';
import { Client } from 'mqtt';
import { filter, fromEvent, map } from 'rxjs';


export class TopicTransportSession extends AbstractTransportSession<Client> {

    private replys: Set<string> = new Set();

    protected async write(data: Buffer, packet: Packet<any>): Promise<void> {
        const topic = this.options.serverSide ? this.getReply(packet) : packet.topic;
        if (!topic) throw new BadRequestExecption();
        await promisify(this.socket.publish, this.socket)(topic, data)
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
    }
}

@Injectable()
export class TopicTransportSessionFactory implements TransportSessionFactory<Client> {

    constructor(private factory: TransportFactory) { }

    create(socket: Client, transport: Transport, options?: TransportOpts): TopicTransportSession {
        return new TopicTransportSession(socket, this.factory.createSender(transport, options), this.factory.createReceiver(transport, options), options);
    }

}
