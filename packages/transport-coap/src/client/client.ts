import { Client, Connection, TransportEvent, TransportRequest } from '@tsdi/core';
import { Inject, Injectable } from '@tsdi/ioc';
import { ConnectionOpts, DuplexConnection, parseToDuplex } from '@tsdi/platform-server-transport';
import * as dgram from 'dgram';
import * as net from 'net';
import { Observable } from 'rxjs';
import { CoapPacketFactory } from '../transport';
import { COAP_CLIENT_OPTS, CoapClientOpts } from './options';
import { CoapHandler } from './handler';


/**
 * COAP Client.
 */
@Injectable()
export class CoapClient extends Client<TransportRequest, TransportEvent> {

    constructor(
        readonly handler: CoapHandler,
        @Inject(COAP_CLIENT_OPTS, { nullable: true }) private option: CoapClientOpts) {
        super();
    }

    protected connect(): Promise<any> | Observable<any> {
        throw new Error('Method not implemented.');
    }
    protected onShutdown(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    protected isValid(connection: Connection<dgram.Socket | net.Socket>): boolean {
        return !connection.destroyed;
    }

    protected createConnection(opts: ConnectionOpts): Connection<dgram.Socket | net.Socket> {
        const socket = opts.baseOn === 'tcp' ? net.connect(opts.connectOpts as net.TcpNetConnectOpts) : dgram.createSocket(opts.connectOpts as dgram.SocketOptions);
        const packet = this.handler.injector.get(CoapPacketFactory);
        return new DuplexConnection(socket, packet, { parseToDuplex, ...opts });
    }

    // protected onConnect(duplex: Duplex, opts?: ConnectionOpts): Observable<Connection> {
    //     const logger = this.logger;
    //     const packetor = this.context.get(CoapPacketFactory);
    //     return new Observable((observer: Observer<Connection>) => {
    //         const client = new Connection(duplex, packetor, opts);
    //         if (opts?.keepalive) {
    //             client.setKeepAlive(true, opts.keepalive);
    //         }

    //         const onError = (err: Error) => {
    //             logger.error(err);
    //             observer.error(err);
    //         }
    //         const onClose = () => {
    //             client.end();
    //         };
    //         const onConnected = () => {
    //             observer.next(client);
    //         }
    //         client.on(ev.ERROR, onError);
    //         client.on(ev.CLOSE, onClose);
    //         client.on(ev.END, onClose);
    //         client.on(ev.CONNECT, onConnected);

    //         return () => {
    //             client.off(ev.ERROR, onError);
    //             client.off(ev.CLOSE, onClose);
    //             client.off(ev.END, onClose);
    //             client.off(ev.CONNECT, onConnected);
    //         }
    //     });
    // }

}
