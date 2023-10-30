import { Abstract, ArgumentExecption, Injectable, Optional, isString } from '@tsdi/ioc';
import { Decoder, Encoder, StreamAdapter, TransportSession, TransportSessionFactory, TransportSessionOpts, Subpackage, TopicTransportSession, ev } from '@tsdi/transport';
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


const PATTERN_MSG_BUFFER = 'pmessageBuffer';

export const defaultMaxSize = 1024 * 256 - 6;

export class RedisTransportSession extends TopicTransportSession<ReidsTransport> {

    maxSize = defaultMaxSize;

    override write(subpkg: Subpackage, chunk: Buffer | null, callback?: ((err?: any) => void) | undefined): void {
        const topic = subpkg.packet.topic ?? subpkg.packet.url!;
        if (!subpkg.headerSent) {
            const buff = this.generateHeader(subpkg);
            if (this.hasPayloadLength(subpkg.packet)) {
                subpkg.residueSize = subpkg.payloadSize ?? 0;
                subpkg.caches = [buff];
                subpkg.cacheSize = Buffer.byteLength(buff);
                subpkg.headerSent = true;
                subpkg.headCached = true;
                if (chunk) {
                    this.write(subpkg, chunk, callback)
                } else {
                    callback?.();
                }
            } else {
                this.socket.publisher.publish(topic, buff, (err) => {
                    if (err) {
                        this.handleFailed(err);
                    }
                    callback?.(err);
                });
            }
            return;
        }

        if (!chunk) throw new ArgumentExecption('chunk can not be null!');


        const bufSize = Buffer.byteLength(chunk);
        const maxSize = (this.options.maxSize || this.maxSize) - (subpkg.headCached ? 6 : 3);

        const tol = subpkg.cacheSize + bufSize;
        if (tol == maxSize) {
            subpkg.caches.push(chunk);
            const data = this.getSendBuffer(subpkg, maxSize);
            subpkg.residueSize -= bufSize;
            this.socket.publisher.publish(topic, data, (err) => {
                if (err) {
                    this.handleFailed(err);
                }
                callback?.(err);
            });
        } else if (tol > maxSize) {
            const idx = bufSize - (tol - maxSize);
            const message = chunk.subarray(0, idx);
            const rest = chunk.subarray(idx);
            subpkg.caches.push(message);
            const data = this.getSendBuffer(subpkg, maxSize);
            subpkg.residueSize -= (bufSize - Buffer.byteLength(rest));
            this.socket.publisher.publish(topic, data, (err) => {
                if (err) {
                    this.handleFailed(err);
                    return callback?.(err);
                }
                if (rest.length) {
                    this.write(subpkg, rest, callback)
                }
            })
        } else {
            subpkg.caches.push(chunk);
            subpkg.cacheSize += bufSize;
            subpkg.residueSize -= bufSize;
            if (subpkg.residueSize <= 0) {
                const data = this.getSendBuffer(subpkg, subpkg.cacheSize);
                this.socket.publisher.publish(topic, data, (err) => {
                    if (err) {
                        this.handleFailed(err);
                    }
                    callback?.(err);
                });
            } else if (callback) {
                callback()
            }
        }

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
