import { Injectable, lang } from '@tsdi/ioc';
import { ClientRequsetOpts, ClientSession, ClientBuilder, ClientSessionOpts, ClientStream, ev, TransportClient, PacketParser } from '@tsdi/transport';
import { Observable, Observer } from 'rxjs';
import { Duplex } from 'stream';
import * as dgram from 'dgram';
import * as net from 'net'
import { OutgoingHeaders } from '@tsdi/core';
import { CoapClientOpts } from './client';
import { parseToDuplex, UdpCoapPacketParser } from '../udp';
import { TcpCoapPacketParser } from '../tcp';


@Injectable()
export class CoapClientBuilder implements ClientBuilder<TransportClient> {
    build(transport: TransportClient, opts: CoapClientOpts): Observable<ClientSession> {
        const { context } = transport;
        const parser = opts.baseOn === 'tcp' ? context.get(TcpCoapPacketParser) : context.get(UdpCoapPacketParser);
        return new Observable((observer: Observer<ClientSession>) => {
            const socket = opts.baseOn === 'tcp' ? net.connect(opts.connectOpts as net.NetConnectOpts) : parseToDuplex(dgram.createSocket(opts.connectOpts as dgram.SocketOptions));
            const client = new CoapClientSession(socket, parser, opts.connectionOpts);
            const onError = (err: Error) => {
                observer.error(err);
            }
            const onClose = () => {
                client.end();
            };
            const onConnected = () => {
                observer.next(client);
            }
            client.on(ev.ERROR, onError);
            socket.on(ev.CLOSE, onClose);
            socket.on(ev.END, onClose);
            client.on(ev.CONNECT, onConnected);

            return () => {
                client.off(ev.ERROR, onError);
                client.off(ev.CLOSE, onClose);
                client.off(ev.END, onClose);
                client.off(ev.CONNECT, onConnected);
            }
        });
    }

}



export class CoapClientSession extends ClientSession {

    private smaps: Map<string, ClientStream>;

    constructor(stream: Duplex, packet: PacketParser, ops?: ClientSessionOpts) {
        super(stream, packet, ops)
        this.smaps = new Map();
    }

    request(headers: OutgoingHeaders, options?: ClientRequsetOpts | undefined): ClientStream {
        const id = this.packet.generateId();
        const stream = new ClientStream(this, id);
        this.emit(ev.STREAM, headers);
        this.smaps.set(id, stream);
        return stream;
    }

    close(): Promise<void> {
        const defer = lang.defer<void>();
        this.end(() => {
            this.closed = true;
            defer.resolve();
        });
        return defer.promise
    }

}