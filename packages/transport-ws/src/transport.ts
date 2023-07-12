import { Decoder, Encoder, HeaderPacket, IReadableStream, SendOpts, StreamAdapter, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Abstract, Injectable, Optional } from '@tsdi/ioc';
import { SocketTransportSession, ev } from '@tsdi/transport';
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

    write(chunk: Buffer, packet: HeaderPacket, callback?: ((err?: any) => void) | undefined): void {
        this.socket.write(chunk, callback);
    }
    protected async pipeStream(payload: IReadableStream, packet: HeaderPacket, options?: SendOpts | undefined): Promise<void> {
        this.socket.write(Buffer.concat([
            this.generateHeader(packet, options),
            this.generatePayloadFlag(packet, options)
        ]));
        payload.pipe(this.socket);
    }

    protected writeBuffer(buffer: Buffer) {
        this.socket.write(buffer);
    }

    protected handleFailed(error: any): void {
        this.socket.emit(ev.ERROR, error.message);
        this.socket.end();
    }

}



