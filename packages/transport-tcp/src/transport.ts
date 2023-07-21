import { Decoder, Encoder, StreamAdapter, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Abstract, ArgumentExecption, Injectable, Optional, promisify } from '@tsdi/ioc';
import { SendPacket, SocketTransportSession, ev } from '@tsdi/transport';
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

    write(packet: SendPacket, chunk: Buffer | null, callback?: ((err?: any) => void) | undefined): void {
        if (!packet.headerSent) {
            this.generateHeader(packet)
                .then((buff) => {
                    this.socket.write(buff, (err) => {
                        packet.headerSent = true;
                        if (!err && chunk) {
                            this.write(packet, chunk, callback);
                        } else {
                            callback?.(err);
                        }
                    })
                })
                .catch(err => callback?.(err))
            return;
        }
        if (!chunk) throw new ArgumentExecption('chunk can not be null!')
        if (!packet.payloadSent) {
            const prefix = this.getPayloadPrefix(packet, packet.payloadSize!);
            packet.payloadSent = true;
            this.socket.write(Buffer.concat([prefix, chunk]), callback)
        } else {
            this.socket.write(chunk, callback)
        }
    }

    protected handleFailed(error: any): void {
        this.socket.emit(ev.ERROR, error.message);
        this.socket.end();
    }

}



