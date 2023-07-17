import { Decoder, Encoder, HeaderPacket, IReadableStream, SendOpts, StreamAdapter, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Abstract, Injectable, Optional } from '@tsdi/ioc';
import { SendPacket, SocketTransportSession, ev } from '@tsdi/transport';
import { Duplex } from 'stream';
import { WebSocket, createWebSocketStream } from 'ws';



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

    maxSize = 1024 * 256;

    write(packet: SendPacket, chunk: Buffer | null, callback?: ((err?: any) => void) | undefined): void {
        const pkgSize = packet.size ?? 0;
        if (pkgSize <= this.maxSize) {
            this.socket.write(chunk, callback);
        } else {
            const size = Buffer.byteLength(chunk);
            if (!packet.sentSize) {
                packet.sentSize = size
            } else {
                packet.sentSize += size
            }
            if (packet.sentSize > this.maxSize) {
                packet.sentSize = size;
                this.socket.write(0);
                this.socket.write(chunk, callback);
            } else if (packet.sentSize == this.maxSize) {
                this.socket.write(chunk, callback);
                this.socket.write(0);
                packet.sentSize = 0;
            }
        }
    }

    protected async pipeStream(payload: IReadableStream, packet: HeaderPacket, options?: SendOpts | undefined): Promise<void> {
        const header = await this.generateHeader(packet, options);
        this.socket.write(Buffer.concat([
            header,
            this.getPayloadPrefix(packet, options)
        ]));
        payload.pipe(this.socket);
    }

    protected handleFailed(error: any): void {
        this.socket.emit(ev.ERROR, error.message);
        this.socket.end();
    }

}



