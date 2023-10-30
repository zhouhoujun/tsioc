import { BadRequestExecption, IncomingHeaders, Packet, Receiver, RequestPacket, ResponsePacket, SendPacket, Sender, TransportFactory, TransportOpts, TransportSessionFactory, ev, hdr } from '@tsdi/common';
import { EventTransportSession } from '@tsdi/endpoints';
import { UuidGenerator } from '@tsdi/core';
import { Injectable, Injector, isNil } from '@tsdi/ioc';
import { Channel, ConsumeMessage } from 'amqplib';
import { Observable, fromEvent, map, of } from 'rxjs';
import { AmqpSessionOpts } from './options';


export class QueueTransportSession extends EventTransportSession<Channel, ConsumeMessage> {

    constructor(
        injector: Injector,
        socket: Channel,
        sender: Sender,
        receiver: Receiver,
        private uuidGenner: UuidGenerator,
        options: TransportOpts) {
        super(injector, socket, sender, receiver, options)
    }


    protected async write(data: Buffer, packet: Packet<any>): Promise<void> {
        const options = this.options as AmqpSessionOpts;
        const queue = options.serverSide ? packet.replyTo ?? options.replyQueue! : options.queue!;
        if (!queue) throw new BadRequestExecption();
        const replys = options.serverSide ? undefined : {
            replyTo: packet.replyTo ?? options.replyQueue,
            persistent: options.persistent,
        };
        const headers = { ...options.publishOpts?.headers, ...packet.headers };
        headers[hdr.TOPIC] = packet.topic;
        this.socket.sendToQueue(queue, data ?? Buffer.alloc(0), {
            ...replys,
            ...options.publishOpts,
            headers,
            contentType: headers[hdr.CONTENT_TYPE],
            contentEncoding: headers[hdr.CONTENT_ENCODING],
            correlationId: packet.id,
        })
    }

    protected override async beforeRequest(packet: RequestPacket<any>): Promise<void> {
        packet.replyTo = (this.options as AmqpSessionOpts).replyQueue;
    }

    protected override responseFilter(req: RequestPacket<any>, msg: ConsumeMessage): boolean {
        return req.id == msg.properties.correlationId
    }

    protected override responsePacketFilter(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return res.topic == req.topic && req.id == req.id
    }

    protected override message(): Observable<any> {
        return fromEvent(this.socket, ev.MESSAGE, (queue: string, message: ConsumeMessage) => message)
    }

    protected override pack(packet: Packet<any>): Observable<Buffer> {
        (packet as SendPacket).__sent = true;
        (packet as SendPacket).__headMsg = true;
        return this.sender.send(this.contextFactory, packet);
    }

    protected override unpack(msg: ConsumeMessage): Observable<Packet> {

        const { correlationId, replyTo, contentType, contentEncoding } = msg.properties;
        const headers = { ...msg.properties.headers, contentType, contentEncoding } as IncomingHeaders;
        headers[hdr.CONTENT_TYPE] = contentType;
        headers[hdr.CONTENT_ENCODING] = contentEncoding;

        const pkg = {
            id: correlationId,
            topic: headers[hdr.TOPIC],
            replyTo: replyTo,
            headers,
            __headMsg: true
        } as SendPacket;

        return this.receiver.receive(this.contextFactory, msg.content, headers[hdr.TOPIC] ?? correlationId, pkg)
            .pipe(
                map(payload => {
                    return {
                        ...pkg,
                        ...payload
                    } as Packet
                })
            )
    }

    protected override getPacketId(): string {
        return this.uuidGenner.generate()
    }

    async destroy(): Promise<void> {

    }
}

@Injectable()
export class AmqpTransportSessionFactory implements TransportSessionFactory<Channel> {

    constructor(
        readonly injector: Injector,
        private factory: TransportFactory,
        private uuidGenner: UuidGenerator) { }

    create(socket: Channel, options: TransportOpts): QueueTransportSession {
        return new QueueTransportSession(this.injector, socket, this.factory.createSender(options), this.factory.createReceiver(options), this.uuidGenner, options);
    }

}
