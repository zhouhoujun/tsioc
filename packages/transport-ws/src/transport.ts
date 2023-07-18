import { Decoder, Encoder, HeaderPacket, IReadableStream, SendOpts, StreamAdapter, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Abstract, ArgumentExecption, Injectable, Optional, isNil } from '@tsdi/ioc';
import { SendPacket, SocketTransportSession, ev } from '@tsdi/transport';
import { WebSocket, createWebSocketStream } from 'ws';
import { Duplex } from 'stream';



@Abstract()
export abstract class WsTransportSessionFactory extends TransportSessionFactory<Duplex> {
    abstract create(socket: Duplex | WebSocket, opts: TransportSessionOpts): WsTransportSession;
}


@Injectable()
export class WsTransportSessionFactoryImpl implements WsTransportSessionFactory {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: Duplex | WebSocket, opts: TransportSessionOpts): WsTransportSession {
        return new WsTransportSession(socket instanceof Duplex ? socket : createWebSocketStream(socket, opts), this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}

export class WsTransportSession extends SocketTransportSession<Duplex> {

    maxSize = 1024 * 256 - 3;

    write(packet: SendPacket, chunk: Buffer | null, callback?: ((err?: any) => void) | undefined): void {
        if (!packet.headerSent) {
            this.generateHeader(packet)
                .then((buff) => {
                    this.socket.write(buff, (err) => {
                        packet.headerSent = true;
                        if (!err && chunk) {
                            this.write(packet, chunk, callback);
                        } else {
                            callback && callback(err);
                        }
                    })
                })
                .catch(err => callback && callback(err))
            return;
        }
        if (!chunk) throw new ArgumentExecption('chunk can not be null!')
        const pkgSize = packet.payloadSize ?? 0;
        if (pkgSize <= this.maxSize) {
            if (!packet.payloadSent) {
                const prefix = this.getPayloadPrefix(packet, packet.payloadSize!);
                packet.payloadSent = true;
                this.socket.write(chunk ? Buffer.concat([prefix, chunk]) : chunk, callback)
            } else {
                this.socket.write(chunk, callback)
            }
        } else {
            if (isNil(packet.residueSize)) {
                packet.residueSize = packet.payloadSize ?? 0;
            }
            if (isNil(packet.cacheSize)) {
                packet.cacheSize = 0;
            }
            if (isNil(packet.caches)) {
                packet.caches = [];
            }


            const bufSize = Buffer.byteLength(chunk);

            const tol = packet.cacheSize + bufSize;
            if (tol == this.maxSize) {
                const prefix = this.getPayloadPrefix(packet, this.maxSize);
                packet.caches.push(chunk);
                const data = Buffer.concat([prefix, ...packet.caches]);
                packet.residueSize -= this.maxSize;
                packet.caches = [];
                packet.cacheSize = 0;
                this.socket.write(data, callback);
            } else if (tol > this.maxSize) {
                const idx = bufSize - (tol - this.maxSize);
                const message = chunk.subarray(0, idx);
                const rest = chunk.subarray(idx);
                const prefix = this.getPayloadPrefix(packet, this.maxSize);
                packet.caches.push(message);
                const data = Buffer.concat([prefix, ...packet.caches]);
                packet.caches = [rest];
                packet.cacheSize = rest.length;
                packet.residueSize -= this.maxSize;
                this.socket.write(data, callback);
            } else {
                packet.caches.push(chunk);
                packet.cacheSize += bufSize;
                packet.residueSize -= bufSize;
                if (packet.residueSize <= 0) {
                    const prefix = this.getPayloadPrefix(packet, packet.residueSize > this.maxSize ? this.maxSize : packet.residueSize);
                    packet.residueSize -= this.maxSize;
                    const data = Buffer.concat([prefix, ...packet.caches]);
                    packet.caches = [];
                    packet.cacheSize = 0;
                    this.socket.write(data, callback);
                }
            }
        }
    }

    protected async pipeStream(payload: IReadableStream, packet: HeaderPacket, options?: SendOpts | undefined): Promise<void> {
        await this.writeAsync(packet, null);
        await this.streamAdapter.pipeTo(payload, this.socket);
    }

    protected handleFailed(error: any): void {
        this.socket.emit(ev.ERROR, error.message);
        this.socket.end();
    }

}



