import { BadRequestExecption, IncomingHeaders, Packet, Receiver, RequestPacket, ResponsePacket, Sender, Transport, TransportFactory, TransportOpts, TransportSessionFactory, ev } from '@tsdi/common';
import { EventTransportSession } from '@tsdi/endpoints';
import { UuidGenerator } from '@tsdi/core';
import { hdr } from '@tsdi/endpoints/assets';
import { Injectable } from '@tsdi/ioc';
import { Channel, ConsumeMessage } from 'amqplib';
import { Observable, filter, fromEvent, map, of } from 'rxjs';
import { AmqpSessionOpts } from './options';


export class QueueTransportSession extends EventTransportSession<Channel, ConsumeMessage> {

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

    protected override initRequest(packet: RequestPacket<any>): void {
        super.initRequest(packet);
        packet.replyTo = (this.options as AmqpSessionOpts).replyQueue;
    }

    protected reqMsgFilter(req: RequestPacket<any>, msg: ConsumeMessage): boolean {
        return req.id == msg.properties.correlationId 
    }
    
    protected override reqResFilter(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
        return res.topic == req.topic && req.id == req.id
    }

    protected override message(): Observable<any> {
        return fromEvent(this.socket, ev.MESSAGE, (queue: string, message: ConsumeMessage) => message)
    }

    protected override pack(packet: Packet<any>): Observable<Buffer> {
        const { replyTo, topic, id, headers, ...data} = packet;
        return this.sender.send(data);
    }

    protected override unpack(msg: ConsumeMessage): Observable<Packet> {

        const { correlationId, replyTo, contentType, contentEncoding } = msg.properties;
        const headers = { ...msg.properties.headers, contentType, contentEncoding } as IncomingHeaders;
        headers[hdr.CONTENT_TYPE] = contentType;
        headers[hdr.CONTENT_ENCODING] = contentEncoding;
        return this.receiver.receive(msg.content)
            .pipe(
                map(payload => {
                    return {
                        id: correlationId,
                        topic: headers[hdr.TOPIC],
                        replyTo: replyTo,
                        headers,
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
        private factory: TransportFactory,
        private uuidGenner: UuidGenerator) { }

    create(socket: Channel, transport: Transport, options?: TransportOpts): QueueTransportSession {
        return new QueueTransportSession(socket, this.factory.createSender(transport, options), this.factory.createReceiver(transport, options), this.uuidGenner, options);
    }

}
