import { Decoder, Encoder, HeaderPacket, IReadableStream, SendOpts, StreamAdapter, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Abstract, Injectable, Optional } from '@tsdi/ioc';
import { SocketTransportSession, ev } from '@tsdi/transport';
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

    write(chunk: Buffer, packet?: HeaderPacket | undefined, callback?: ((err?: any) => void) | undefined): void {
        this.socket.write(chunk, callback)
    }

    protected async pipeStream(payload: IReadableStream, packet: HeaderPacket, options?: SendOpts): Promise<void> {
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



