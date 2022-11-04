import { ExecptionFilter, Interceptor, RequestOptions, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { Connection, DuplexConnection, ConnectionOpts, ev, parseToDuplex, TransportClient, TransportClientOpts } from '@tsdi/transport';
import * as dgram from 'dgram';
import * as net from 'net';
import { Observable, Observer } from 'rxjs';
import { CoapPacketFactory, CoapVaildator } from '../transport';


@Abstract()
export abstract class CoapClientOpts extends TransportClientOpts {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract encoding?: BufferEncoding;
    abstract baseOn?: 'tcp' | 'udp';
    abstract connectOpts: dgram.SocketOptions | net.TcpNetConnectOpts;
}

/**
 * Coap client interceptors.
 */
export const COAP_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('COAP_INTERCEPTORS');

/**
 * Coap client interceptors.
 */
export const COAP_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('COAP_EXECPTIONFILTERS');

const defaults = {
    transport: {
        strategy: CoapVaildator
    },
    interceptorsToken: COAP_INTERCEPTORS,
    execptionsToken: COAP_EXECPTIONFILTERS,
    address: {
        port: 3000,
        hostname: 'localhost'
    },
    connectOpts: {
        type: 'udp4'
    }
} as CoapClientOpts;



/**
 * COAP Client.
 */
@Injectable()
export class CoapClient extends TransportClient<Connection<dgram.Socket | net.Socket>, string, RequestOptions, CoapClientOpts> {

    constructor(@Nullable() option: CoapClientOpts) {
        super(option);
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    protected isValid(connection: Connection<dgram.Socket | net.Socket>): boolean {
        return !connection.isClosed && !connection.destroyed;
    }

    protected override getDefaultOptions() {
        return defaults;
    }


    protected override createConnection(opts: ConnectionOpts): Connection<dgram.Socket | net.Socket> {
        const socket = opts.baseOn === 'tcp' ? net.connect(opts.connectOpts as net.TcpNetConnectOpts) : dgram.createSocket(opts.connectOpts as dgram.SocketOptions);
        const packet = this.context.get(CoapPacketFactory);
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
