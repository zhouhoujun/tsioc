import { Decoder, Encoder, StreamAdapter, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Abstract, ArgumentExecption, Injectable, Optional, isNil, isString } from '@tsdi/ioc';
import { Subpackage, TopicTransportSession, ev } from '@tsdi/transport';
import Redis from 'ioredis';
import { Buffer } from 'buffer';


export interface ReidsTransport {
    publisher: Redis;
    subscriber: Redis;
}


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

    maxSize = 1024 * 256 - 6;

    override write(packet: Subpackage, chunk: Buffer | null, callback?: ((err?: any) => void) | undefined): void {
        if (!packet.headerSent) {
            this.generateHeader(packet)
                .then((buff) => {
                    if (this.hasPayloadLength(packet)) {
                        packet.residueSize = packet.payloadSize ?? 0;
                        packet.caches = [buff];
                        packet.cacheSize = Buffer.byteLength(buff);
                        packet.headerSent = true;
                        packet.headCached = true;
                        if (chunk) {
                            this.write(packet, chunk, callback)
                        } else {
                            callback?.();
                        }
                    } else {
                        this.socket.publisher.publish(packet.url!, buff, callback);
                    }
                })
                .catch(err => callback?.(err))
            return;
        }

        if (!chunk) throw new ArgumentExecption('chunk can not be null!');


        const bufSize = Buffer.byteLength(chunk);
        const maxSize = this.maxSize - (packet.headCached ? 6 : 3);
        
        const tol = packet.cacheSize + bufSize;
        if (tol == maxSize) {
            packet.caches.push(chunk);
            const data = this.getSendBuffer(packet, maxSize);
            packet.residueSize -= bufSize;
            this.socket.publisher.publish(packet.url!, data, callback);
        } else if (tol > maxSize) {
            const idx = bufSize - (tol - maxSize);
            const message = chunk.subarray(0, idx);
            const rest = chunk.subarray(idx);
            packet.caches.push(message);
            const data = this.getSendBuffer(packet, maxSize);
            packet.residueSize -= (bufSize - Buffer.byteLength(rest));
            this.socket.publisher.publish(packet.url!, data, (err) => {
                if (err) throw err;
                if (rest.length) {
                    this.write(packet, rest, callback)
                }
            })
        } else {
            packet.caches.push(chunk);
            packet.cacheSize += bufSize;
            packet.residueSize -= bufSize;
            if (packet.residueSize <= 0) {
                const data = this.getSendBuffer(packet, packet.cacheSize);
                this.socket.publisher.publish(packet.url!, data, callback);
            } else if (callback) {
                callback()
            }
        }

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
