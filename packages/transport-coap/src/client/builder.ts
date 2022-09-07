import { Injectable } from '@tsdi/ioc';
import { ClientSession, ClientBuilder, ClientStream, ev, TransportClient, PacketProtocol, parseToDuplex } from '@tsdi/transport';
import { Observable, Observer } from 'rxjs';
import * as dgram from 'dgram';
import * as net from 'net'
import { IncomingHeaders, RequestOptions, TransportRequest } from '@tsdi/core';
import { CoapClientOpts } from './client';
import { CoapProtocol } from '../protocol';


@Injectable()
export class CoapClientBuilder implements ClientBuilder {

    buildRequest(url: string, options?: RequestOptions | undefined) {
        return new TransportRequest({ ...options, url });
    }

    build(transport: TransportClient, opts: CoapClientOpts): Observable<ClientSession> {
        const { context } = transport;
        const parser = context.get(CoapProtocol);
        return new Observable((observer: Observer<ClientSession>) => {
            const socket = opts.baseOn === 'tcp' ? net.connect(opts.connectOpts as net.NetConnectOpts) : parseToDuplex(dgram.createSocket(opts.connectOpts as dgram.SocketOptions));
            const client = new ClientSession(socket, parser, opts.connectionOpts, this);
            const onError = (err: Error) => {
                observer.error(err);
            }
            const onClose = () => {
                client.end();
            };
            const onConnected = () => {
                observer.next(client);
            }

            socket.on(ev.ERROR, onError);
            socket.on(ev.CLOSE, onClose);
            socket.on(ev.END, onClose);
            socket.on(ev.CONNECT, onConnected);

            return () => {
                socket.off(ev.ERROR, onError);
                socket.off(ev.CLOSE, onClose);
                socket.off(ev.END, onClose);
                socket.off(ev.CONNECT, onConnected);
            }
        });
    }


    request(connection: ClientSession, headers: IncomingHeaders, options: any): ClientStream {
        const id = connection.getNextStreamId();
        const stream = new ClientStream(connection, id, headers, options);
        stream.write({ headers });
        return stream;
    }


}

