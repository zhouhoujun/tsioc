import { Decoder, Encoder, Packet, StreamAdapter, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Abstract, Injectable, Optional, isString, tokenId } from '@tsdi/ioc';
import { TopicTransportSession, ev } from '@tsdi/transport';
import Redis from 'ioredis';
import { Buffer } from 'buffer';


export interface ReidsTransport {
    publisher: Redis;
    subscriber: Redis;
}

export const REIDS_TRANSPORT = tokenId<ReidsTransport>('REIDS_TRANSPORT');

@Abstract()
export abstract class RedisTransportSessionFactory extends TransportSessionFactory<ReidsTransport> {

}

@Injectable()
export class RedisTransportSessionFactoryImpl implements RedisTransportSessionFactory {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: ReidsTransport, opts: TransportSessionOpts): TransportSession<ReidsTransport> {
        return new RedisTransportSession(socket, this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}


const PATTERN_MSG_BUFFER = 'pmessageBuffer'

export class RedisTransportSession extends TopicTransportSession<ReidsTransport> {

    protected override writeBuffer(buffer: Buffer, packet: Packet) {
        this.socket.publisher.publish(packet.url!, buffer);
    }
    protected override handleFailed(error: any): void {
        this.emit(ev.ERROR, error.message);
    }


    protected override bindMessageEvent(): void {
        const e = ev.MESSAGE_BUFFER;
        const event = (topic: string | Buffer, chunk: string | Buffer) => this.onData(isString(topic) ? topic : topic.toString(), chunk);
        this.socket.subscriber.on(e, event);
        this._evs.push([e, event]);

        const pevent = (pattern: string, topic: string | Buffer, chunk: string | Buffer) => {
            const channel = isString(topic) ? topic : topic.toString();
            if (this.options.serverSide && channel.endsWith('.reply')) return;
            this.onData(channel, chunk);
        }
        this.socket.subscriber.on(PATTERN_MSG_BUFFER, pevent);
        this._evs.push([PATTERN_MSG_BUFFER, pevent]);
    }

    protected override onSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.publisher.on(name, event);
        this.socket.subscriber.on(name, event);
    }

    protected override offSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.publisher.off(name, event);
        this.socket.subscriber.off(name, event);
    }

}
