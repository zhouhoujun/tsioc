import { Injectable, Injector } from '@tsdi/ioc';
import { BadRequestExecption, Context, Decoder, Encoder, HeaderPacket, IncomingHeaders, Packet, RequestPacket, ResponsePacket, StreamAdapter, TransportOpts, TransportSessionFactory, ev, hdr } from '@tsdi/common';
import { PayloadTransportSession } from '@tsdi/endpoints';
import { Channel, ConsumeMessage } from 'amqplib';
import { Observable, first, fromEvent, map, merge, of } from 'rxjs';
import { AmqpSessionOpts } from './options';


export class QueueTransportSession extends PayloadTransportSession<Channel, ConsumeMessage> {


    protected concat(msg: ConsumeMessage): Observable<Buffer> {
        return of(msg.content);
    }
    protected mergeClose(source: Observable<any>): Observable<any> {
        const close$ = fromEvent(this.socket, ev.CLOSE).pipe(
            map(err => {
                throw err
            }));
        const error$ = fromEvent(this.socket, ev.ERROR);
        return merge(source, error$, close$).pipe(first());

    }

    protected override getHeaders(msg: ConsumeMessage): HeaderPacket | undefined {
        const { correlationId, replyTo, contentType, contentEncoding } = msg.properties;
        const headers = { ...msg.properties.headers, contentType, contentEncoding } as IncomingHeaders;
        headers[hdr.CONTENT_TYPE] = contentType;
        headers[hdr.CONTENT_ENCODING] = contentEncoding;

        return {
            id: correlationId,
            topic: headers[hdr.TOPIC],
            replyTo: replyTo,
            headers,
        };
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

    protected override afterDecode(ctx: Context, pkg: Packet<any>, msg: ConsumeMessage): Packet<any> {

        return {
            ...ctx.headers,
            ...pkg
        }

    }

    async destroy(): Promise<void> {

    }
}

@Injectable()
export class AmqpTransportSessionFactory implements TransportSessionFactory<Channel> {

    constructor(
        readonly injector: Injector,
        private streamAdapter: StreamAdapter,
        private encoder: Encoder,
        private decoder: Decoder) { }

    create(socket: Channel, options: TransportOpts): QueueTransportSession {
        return new QueueTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, options);
    }

}
