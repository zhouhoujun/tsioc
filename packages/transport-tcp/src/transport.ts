import { Decoder, Encoder, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Injectable, Optional, } from '@tsdi/ioc';
import { StreamAdapter, SocketTransportSession, ev } from '@tsdi/transport';
import * as net from 'net';
import * as tls from 'tls';

@Injectable()
export class TcpTransportSessionFactory implements TransportSessionFactory<tls.TLSSocket | net.Socket> {

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



