import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { BadRequestExecption, IEventEmitter, IReadableStream, Packet, PacketBuffer, RequestPacket, ResponsePacket, StreamAdapter, TransportOpts, ev } from '@tsdi/common';
import { Observable, filter, fromEvent } from 'rxjs';
import { ServerEventTransportSession } from './transport.session';
import { IncomingDecoder, OutgoingEncoder } from '../transport/codings';
import { IncomingContext, ServerTransportSessionFactory } from '../transport/session';
import { ServerOpts } from '../Server';
import { TransportContext } from '../TransportContext';


export interface TopicClient extends IEventEmitter {
    subscribe(topics: string | string[]): void;
    publish(topic: string, data: Buffer, callback?: (err: any, res: any) => void): void;
    publish(topic: string, data: Buffer, opts: any, callback?: (err: any, res: any) => void): void;
    unsubscribe?(topics: string | string[], callback: (err: any, res: any) => void): void
}

export interface TopicMessage {
    topic: string,
    payload: string | Buffer | Uint8Array
}

export class TopicTransportSession<TSocket extends TopicClient = TopicClient> extends ServerEventTransportSession<TSocket, TopicMessage> {
    protected writeHeader(ctx: TransportContext<any, any, any>): Promise<void> {
        const headBuff = this.generateHeader(ctx);
        return promisify<string, Buffer, void>(this.socket.publish, this.socket)(ctx.response.replyTo, headBuff);
    }
    protected pipe(ata: IReadableStream, ctx: TransportContext<any, any, any>): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected createContext(data: Buffer, msg: TopicMessage, options: ServerOpts<any>): IncomingContext {
        throw new Error('Method not implemented.');
    }
    generateHeader(msg: TransportContext<any, any, any>): Buffer {
        throw new Error('Method not implemented.');
    }
    parseHeader(msg: TransportContext<any, any, any> | Buffer): Packet<any> {
        throw new Error('Method not implemented.');
    }

    protected getTopic(msg: TopicMessage): string {
        return msg.topic
    }
    protected getPayload(msg: TopicMessage): string | Buffer | Uint8Array {
        return msg.payload
    }

    private replys: Set<string> = new Set();

    protected async write(data: Buffer, packet: Packet<any>): Promise<void> {
        const topic = this.options.serverSide ? this.getReply(packet) : packet.topic;
        if (!topic) throw new BadRequestExecption();
        await promisify(this.socket.publish, this.socket)(topic, data)
    }

    // protected override async beforeRequest(packet: RequestPacket<any>): Promise<void> {
    //     if (!this.options.serverSide) {
    //         const rtopic = this.getReply(packet);
    //         if (!this.replys.has(rtopic)) {
    //             this.replys.add(rtopic);
    //             this.socket.subscribe(rtopic);
    //         }
    //     }
    // }

    // protected override responseFilter(req: RequestPacket<any>, msg: TopicMessage): boolean {
    //     return this.getReply(req) == msg.topic;
    // }

    // protected override responsePacketFilter(req: RequestPacket<any>, res: ResponsePacket<any>): boolean {
    //     return req.id === res.id;
    // }

    protected override message(): Observable<any> {
        return fromEvent(this.socket, ev.MESSAGE, (topic: string, payload) => ({ topic, payload })).pipe(
            filter(res => this.options.serverSide ? !res.topic.endsWith('/reply') : true),
        ) as Observable<any>;
    }

    protected getReply(packet: Packet) {
        return packet.replyTo || packet.topic + '/reply';
    }

    async destroy(): Promise<void> {
        if (this.replys.size && this.socket.unsubscribe) {
            await promisify(this.socket.unsubscribe, this.socket)(Array.from(this.replys.values()));
            this.replys.clear();
        }
    }
}

@Injectable()
export class TopicTransportSessionFactory implements ServerTransportSessionFactory<TopicClient> {

    constructor(
        readonly injector: Injector,
        private streamAdapter: StreamAdapter,
        private encoder: OutgoingEncoder,
        private decoder: IncomingDecoder) { }

    create(socket: TopicClient, options: TransportOpts): TopicTransportSession {
        return new TopicTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, new PacketBuffer(), options);
    }

}
