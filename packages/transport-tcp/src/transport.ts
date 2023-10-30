import { Abstract, ArgumentExecption, Injectable, Optional } from '@tsdi/ioc';
import { Decoder, Encoder, StreamAdapter, TransportSessionFactory, TransportSessionOpts, SocketTransportSession, Subpackage, ev } from '@tsdi/transport';
import * as net from 'net';
import * as tls from 'tls';


@Abstract()
export abstract class TcpTransportSessionFactory extends TransportSessionFactory<tls.TLSSocket | net.Socket> {
    abstract create(socket: tls.TLSSocket | net.Socket, opts?: TransportSessionOpts): TcpTransportSession
}


@Injectable()
export class TcpTransportSessionFactoryImpl implements TcpTransportSessionFactory {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: tls.TLSSocket | net.Socket, opts: TransportSessionOpts): TcpTransportSession {
        return new TcpTransportSession(socket, this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}


export const defaultMaxSize = 1024 * 256 - 6;

export class TcpTransportSession extends SocketTransportSession<tls.TLSSocket | net.Socket> {

    maxSize = defaultMaxSize
    write(subpkg: Subpackage, chunk: Buffer | null, callback?: ((err?: any) => void) | undefined): void {
        if (!subpkg.headerSent) {
            const buff = this.generateHeader(subpkg);
            if (this.hasPayloadLength(subpkg.packet)) {
                subpkg.residueSize = subpkg.cacheSize ?? 0;
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
                this.socket.write(buff, (err) => {
                    if (err) {
                        this.handleFailed(err);
                    }
                    callback?.(err);
                });
            }
            return;
        }

        if (!chunk) throw new ArgumentExecption('chunk can not be null!');
        const maxSize = (this.options.maxSize || this.maxSize) - (subpkg.headCached ? 6 : 3);
        const bufSize = Buffer.byteLength(chunk);
        const tol = subpkg.cacheSize + bufSize;
        if (tol == maxSize) {
            subpkg.caches.push(chunk);
            const data = this.getSendBuffer(subpkg, maxSize);
            subpkg.residueSize -= bufSize;
            this.socket.write(data, (err) => {
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
            this.socket.write(data, (err) => {
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
                this.socket.write(data, (err) => {
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

    // write(packet: SendPacket, chunk: Buffer | null, callback?: ((err?: any) => void) | undefined): void {
    //     if (!packet.headerSent) {
    //         this.generateHeader(packet)
    //             .then((buff) => {
    //                 this.socket.write(buff, (err) => {
    //                     packet.headerSent = true;
    //                     if (!err && chunk) {
    //                         this.write(packet, chunk, callback);
    //                     } else {
    //                         callback?.(err);
    //                     }
    //                 })
    //             })
    //             .catch(err => callback?.(err))
    //         return;
    //     }
    //     if (!chunk) throw new ArgumentExecption('chunk can not be null!')
    //     if (!packet.payloadSent) {
    //         const prefix = this.getPayloadPrefix(packet, packet.payloadSize!);
    //         packet.payloadSent = true;
    //         this.socket.write(Buffer.concat([prefix, chunk]), callback)
    //     } else {
    //         this.socket.write(chunk, callback)
    //     }
    // }

    protected handleFailed(error: any): void {
        this.socket.emit(ev.ERROR, error);
        this.socket.end();
    }

}



