import { Client, RequstOption } from '@tsdi/core';
import { ClientBuilder, ClientSession, ev, PacketProtocol, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Observable, Observer } from 'rxjs';
import * as net from 'net';

export class TcpClientBuilder extends ClientBuilder<TransportClient> {

    build(transport: TransportClient, opts: TransportClientOpts): Observable<ClientSession> {
        const { logger, context }  = transport;
        const parser = context.get(PacketProtocol);
        return new Observable((observer: Observer<ClientSession>) => {
            const socket = net.connect(opts.connectOpts as net.NetConnectOpts);
            const client = new ClientSession(socket, parser, opts.connectionOpts);
            const onError = (err: Error) => {
                logger.error(err);
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

}
