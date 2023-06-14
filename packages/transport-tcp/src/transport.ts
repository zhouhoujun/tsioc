import { Decoder, Encoder, StreamAdapter, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Abstract, Injectable, Optional, tokenId, } from '@tsdi/ioc';
import { SocketTransportSession, ev } from '@tsdi/transport';
import * as net from 'net';
import * as tls from 'tls';


@Abstract()
export abstract class TcpTransportSessionFactory extends TransportSessionFactory<tls.TLSSocket | net.Socket> {

}

/**
 * Socket token.
 */
export const TCP_SOCKET = tokenId<tls.TLSSocket | net.Socket>('TCP_SOCKET');

@Injectable()
export class TcpTransportSessionFactoryImpl implements TcpTransportSessionFactory {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: tls.TLSSocket | net.Socket, opts: TransportSessionOpts): TransportSession<tls.TLSSocket | net.Socket> {
        return new TcpTransportSession(socket, this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}

export class TcpTransportSession extends SocketTransportSession<tls.TLSSocket | net.Socket> {

    protected writeBuffer(buffer: Buffer) {
        this.socket.write(buffer);
    }

    protected handleFailed(error: any): void {
        this.socket.emit(ev.ERROR, error.message);
        this.socket.end();
    }

}



