import { Decoder, Encoder, IReadableStream, Packet, StreamAdapter, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Abstract, Injectable, Optional, isString } from '@tsdi/ioc';
import { SocketTransportSession, ev, hdr } from '@tsdi/transport';
import * as net from 'net';
import * as tls from 'tls';


@Abstract()
export abstract class TcpTransportSessionFactory extends TransportSessionFactory<tls.TLSSocket | net.Socket> {

}


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


    protected async writeStream(payload: IReadableStream<any>, headers: Omit<Packet<any>, 'payload'>): Promise<void> {
        const headerBuff = this.generateHeader(headers);
        const len = isString(headers.headers![hdr.CONTENT_LENGTH]) ? ~~headers.headers![hdr.CONTENT_LENGTH] : headers.headers![hdr.CONTENT_LENGTH]!;
        const bufId = Buffer.alloc(2);
        bufId.writeUInt16BE(headers.id);
        this.socket.write(Buffer.from([
            headerBuff,
            Buffer.from(String(len + 3)),
            this.delimiter,
            this._body,
            bufId
        ] as any));
        
        await this.streamAdapter.pipeTo(
            this.encoder ? this.encoder.encode(payload) : payload,
            this.socket);
    }

    protected writeBuffer(buffer: Buffer) {
        this.socket.write(buffer);
    }

    protected handleFailed(error: any): void {
        this.socket.emit(ev.ERROR, error.message);
        this.socket.end();
    }

}



