import { Decoder, Encoder, Packet, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Injectable, Optional, isString } from '@tsdi/ioc';
import { StreamAdapter, TopicTransportSession, ev } from '@tsdi/transport';
import Redis from 'ioredis';
import { Buffer } from 'buffer';


export interface ReidsStream {
    publisher: Redis;
    subscriber: Redis;
}

@Injectable()
export class RedisTransportSessionFactory implements TransportSessionFactory<ReidsStream> {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: ReidsStream, opts: TransportSessionOpts): TransportSession<ReidsStream> {
        return new RedisTransportSession(socket, this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts.delimiter, opts.serverSide);
    }

}


const PATTERN_MSG_BUFFER = 'pmessageBuffer'

export class RedisTransportSession extends TopicTransportSession<ReidsStream> {

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
            if (this.serverSide && channel.endsWith('.reply')) return;
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
