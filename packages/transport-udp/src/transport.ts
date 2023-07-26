import { Abstract, ArgumentExecption, Injectable, Optional } from '@tsdi/ioc';
import { HeaderPacket } from '@tsdi/common';
import { Decoder, Encoder, StreamAdapter, TransportSessionFactory, TransportSessionOpts, TopicTransportSession, Subpackage, ev } from '@tsdi/transport';
import { Socket, RemoteInfo } from 'dgram';
import { defaultMaxSize } from './const';



@Abstract()
export abstract class UdpTransportSessionFactory extends TransportSessionFactory<Socket> {
    abstract create(socket: Socket, opts: TransportSessionOpts): UdpTransportSession;
}


@Injectable()
export class UdpTransportSessionFactoryImpl implements UdpTransportSessionFactory {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: Socket, opts: TransportSessionOpts): UdpTransportSession {
        return new UdpTransportSession(socket, this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}

export class UdpTransportSession extends TopicTransportSession<Socket> {

    protected onSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.on(name, event);
    }
    protected offSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.off(name, event);
    }

    protected override bindMessageEvent(options: TransportSessionOpts) {
        const fn = (msg: Buffer, rinfo: RemoteInfo) => {
            this.onData(`${rinfo.address}:${rinfo.port}`, msg);
        }
        this.onSocket(ev.MESSAGE, fn);
        this._evs.push([ev.MESSAGE, fn]);
    }

    maxSize = defaultMaxSize;
    write(packet: Subpackage, chunk: Buffer, callback?: ((err?: any) => void) | undefined): void {
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
                        this.writing(packet, buff, callback);
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
            this.writing(packet, data, callback);
        } else if (tol > maxSize) {
            const idx = bufSize - (tol - maxSize);
            const message = chunk.subarray(0, idx);
            const rest = chunk.subarray(idx);
            packet.caches.push(message);
            const data = this.getSendBuffer(packet, maxSize);
            packet.residueSize -= (bufSize - Buffer.byteLength(rest));
            this.writing(packet, data, (err) => {
                if (err) {
                    return callback?.(err);
                }
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
                this.writing(packet, data, callback);
            } else if (callback) {
                callback()
            }
        }
    }

    writing(packet: HeaderPacket, chunk: Buffer, callback?: ((err?: any) => void) | undefined): void {
        if (!packet.topic) throw new ArgumentExecption('topic can not be empty.')
        const idx = packet.topic.lastIndexOf(':');
        const port = parseInt(packet.topic.substring(idx + 1));
        const addr = packet.topic.substring(0, idx);
        if (!addr) {
            this.socket.send(chunk, port, (err) => {
                if (err) {
                    this.handleFailed(err);
                }
                callback?.(err);
            })
        } else {
            this.socket.send(chunk, port, addr, (err) => {
                if (err) {
                    this.handleFailed(err);
                }
                callback?.(err);
            })
        }
    }

}



