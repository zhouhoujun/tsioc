import { Abstract, ArgumentExecption, Injectable, Optional } from '@tsdi/ioc';
import { Decoder, Encoder, StreamAdapter, TransportSessionFactory, TransportSessionOpts, SocketTransportSession, Subpackage } from '@tsdi/transport';
import { Socket } from 'dgram';



@Abstract()
export abstract class CoapTransportSessionFactory extends TransportSessionFactory<Socket> {
    abstract create(socket: Socket, opts: TransportSessionOpts): CoapTransportSession;
}


@Injectable()
export class CoapTransportSessionFactoryImpl implements CoapTransportSessionFactory {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: Socket, opts: TransportSessionOpts): CoapTransportSession {
        return new CoapTransportSession(socket, this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}

export class CoapTransportSession extends SocketTransportSession<Socket> {

    maxSize = 1024 - 6;
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
                        this.socket.send(buff, (err) => {
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
            this.socket.send(data, (err) => {
                if (err) {
                    this.handleFailed(err);
                }
                callback?.(err)
            });
        } else if (tol > maxSize) {
            const idx = bufSize - (tol - maxSize);
            const message = chunk.subarray(0, idx);
            const rest = chunk.subarray(idx);
            packet.caches.push(message);
            const data = this.getSendBuffer(packet, maxSize);
            packet.residueSize -= (bufSize - Buffer.byteLength(rest));
            this.socket.send(data, (err) => {
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
                this.socket.send(data, (err) => {
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

}



