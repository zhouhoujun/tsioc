import { BadRequestExecption, Packet, Receiver, RequestPacket, ResponsePacket, Sender, Transport, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { AbstractTransportSession } from '@tsdi/endpoints';
import { UuidGenerator } from '@tsdi/core';
import { hdr } from '@tsdi/endpoints/assets';
import { Injectable } from '@tsdi/ioc';
import { Channel } from 'amqplib';
import { fromEvent, map } from 'rxjs';
import { AmqpSessionOpts } from './options';


export class QueueTransportSession extends AbstractTransportSession<Channel> {

    constructor(
        socket: Channel,
        sender: Sender,
        receiver: Receiver,
        private uuidGenner: UuidGenerator,
        options?: TransportOpts) {
        super(socket, sender, receiver, options)
    }


    protected async write(data: Buffer, packet: Packet<any>): Promise<void> {
        const options = this.options as AmqpSessionOpts;
        const queue = options.serverSide ? packet.replyTo ?? options.replyQueue! : options.queue!;
        if (!queue) throw new BadRequestExecption();
        const replys = options.serverSide ? undefined : {
            replyTo: packet.replyTo,
            persistent: options.persistent,
        };
        const headers = packet.headers!;
        this.socket.sendToQueue(queue, data ?? Buffer.alloc(0), {
            ...replys,
            ...options.publishOpts,
            headers,
            contentType: headers[hdr.CONTENT_TYPE],
            contentEncoding: headers[hdr.CONTENT_ENCODING],
            correlationId: packet.id,
        })
    }

    protected override initRequest(packet: RequestPacket<any>): void {
        super.initRequest(packet);
        packet.replyTo = (this.options as AmqpSessionOpts).replyQueue;
    }

    protected override match(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return res.topic == req.replyTo && req.id == req.id
    }

    protected bindDataEvent() {
        this.subs.add(fromEvent(this.socket, this.getMessageEvent(), (queue: string, message) => {
            return { queue, message };
        }).pipe(
            map(res => {
                return res.message
            })
        ).subscribe(data => this.receiver.receive(data)))
    }

    protected override getMessageEvent(): string {
        return ev.CUSTOM_MESSAGE;
    }

    protected override getPacketId(): string {
        return this.uuidGenner.generate()
    }

    async destroy(): Promise<void> {
        this.subs?.unsubscribe();
    }
}

@Injectable()
export class AmqpTransportSessionFactory implements TransportSessionFactory<Channel> {

    constructor(
        private factory: TransportFactory,
        private uuidGenner: UuidGenerator) { }

    create(socket: Channel, transport: Transport, options?: TransportOpts): QueueTransportSession {
        return new QueueTransportSession(socket, this.factory.createSender(transport, options), this.factory.createReceiver(transport, options), this.uuidGenner, options);
    }

}
