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
    write(subpkg: Subpackage, chunk: Buffer, callback?: ((err?: any) => void) | undefined): void {
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
                this.writing(subpkg.packet, buff, callback);
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
            this.writing(subpkg.packet, data, callback);
        } else if (tol > maxSize) {
            const idx = bufSize - (tol - maxSize);
            const message = chunk.subarray(0, idx);
            const rest = chunk.subarray(idx);
            subpkg.caches.push(message);
            const data = this.getSendBuffer(subpkg, maxSize);
            subpkg.residueSize -= (bufSize - Buffer.byteLength(rest));
            this.writing(subpkg.packet, data, (err) => {
                if (err) {
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
                this.writing(subpkg.packet, data, callback);
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



