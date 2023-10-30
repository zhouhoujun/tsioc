import { Abstract, ArgumentExecption, Injectable, Optional } from '@tsdi/ioc';
import { Decoder, Encoder, StreamAdapter, TransportSession, TransportSessionFactory, TransportSessionOpts, Subpackage, TopicTransportSession } from '@tsdi/transport';
import { Client } from 'mqtt';
import { Buffer } from 'buffer';



@Abstract()
export abstract class MqttTransportSessionFactory extends TransportSessionFactory<Client> {

}

@Injectable()
export class MqttTransportSessionFactoryImpl implements MqttTransportSessionFactory {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: Client, opts: TransportSessionOpts): TransportSession<Client> {
        return new MqttTransportSession(socket, this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}

export const defaultMaxSize = 1024 * 256 - 6;

export class MqttTransportSession extends TopicTransportSession<Client> {

    maxSize = defaultMaxSize;

    write(subpkg: Subpackage, chunk: Buffer, callback?: ((err?: any) => void) | undefined): void {
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
                this.socket.publish(topic, buff, (err) => {
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
            this.socket.publish(topic, data, (err) => {
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
            this.socket.publish(topic, data, (err) => {
                if (err) return callback?.(err);
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
                this.socket.publish(topic, data, (err) => {
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

    protected onSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.on(name, event);
    }
    protected offSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.off(name, event);
    }

}
