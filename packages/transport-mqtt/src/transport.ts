import { Decoder, Encoder, StreamAdapter, TransportSession, TransportSessionFactory, TransportSessionOpts, HeaderPacket } from '@tsdi/core';
import { Abstract, ArgumentExecption, Injectable, Optional, isNil } from '@tsdi/ioc';
import { Subpackage, TopicTransportSession, ev } from '@tsdi/transport';
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
export class MqttTransportSession extends TopicTransportSession<Client> {

    maxSize = 1024 * 256 - 6;

    write(packet: Subpackage, chunk: Buffer, callback?: ((err?: any) => void) | undefined): void {
        const topic = packet.topic ?? packet.url!;
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
                        this.socket.publish(topic, buff, (err) => {
                            if (err) {
                                this.handleFailed(err);
                            }
                            callback?.(err);
                        });
                    }
                })
                .catch(err => callback?.(err))
            return;
        }

        if (!chunk) throw new ArgumentExecption('chunk can not be null!');


        const bufSize = Buffer.byteLength(chunk);
        const maxSize = (this.options.maxSize || this.maxSize) - (packet.headCached ? 6 : 3);
    
        const tol = packet.cacheSize + bufSize;
        if (tol == maxSize) {
            packet.caches.push(chunk);
            const data = this.getSendBuffer(packet, maxSize);
            packet.residueSize -= bufSize;
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
            packet.caches.push(message);
            const data = this.getSendBuffer(packet, maxSize);
            packet.residueSize -= (bufSize - Buffer.byteLength(rest));
            this.socket.publish(topic, data, (err) => {
                if (err) return callback?.(err);
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
