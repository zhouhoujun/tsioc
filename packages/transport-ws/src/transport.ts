import { Abstract, ArgumentExecption, Injectable, Optional } from '@tsdi/ioc';
import { Decoder, Encoder, StreamAdapter, TransportSessionFactory, TransportSessionOpts, SocketTransportSession, Subpackage, ev, IDuplexStream } from '@tsdi/transport';
import { WebSocket, createWebSocketStream } from 'ws';



@Abstract()
export abstract class WsTransportSessionFactory extends TransportSessionFactory<IDuplexStream> {
    abstract create(socket: IDuplexStream | WebSocket, opts: TransportSessionOpts): WsTransportSession;
}


@Injectable()
export class WsTransportSessionFactoryImpl implements WsTransportSessionFactory {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: IDuplexStream | WebSocket, opts: TransportSessionOpts): WsTransportSession {
        return new WsTransportSession(this.streamAdapter.isDuplex(socket) ? socket : createWebSocketStream(socket, opts), this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}

export class WsTransportSession extends SocketTransportSession<IDuplexStream> {

    maxSize = 1024 * 256 - 6;
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


        const bufSize = Buffer.byteLength(chunk);
        const maxSize = (this.options.maxSize || this.maxSize) - (subpkg.headCached ? 6 : 3);

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
                    return callback?.(err)
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

    protected handleFailed(error: any): void {
        this.socket.emit(ev.ERROR, error);
        this.socket.end();
    }

}



