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

export class TcpTransportSession extends SocketTransportSession<tls.TLSSocket | net.Socket> {

    maxSize = 1024 * 256 - 6;
    write(packet: Subpackage, chunk: Buffer | null, callback?: ((err?: any) => void) | undefined): void {
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
                        this.socket.write(buff, (err) => {
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
        const maxSize = (this.options.maxSize || this.maxSize) - (packet.headCached ? 6 : 3);
        const bufSize = Buffer.byteLength(chunk);
        const tol = packet.cacheSize + bufSize;
        if (tol == maxSize) {
            packet.caches.push(chunk);
            const data = this.getSendBuffer(packet, maxSize);
            packet.residueSize -= bufSize;
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
            packet.caches.push(message);
            const data = this.getSendBuffer(packet, maxSize);
            packet.residueSize -= (bufSize - Buffer.byteLength(rest));
            this.socket.write(data, (err) => {
                if (err) {
                    this.handleFailed(err);
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



