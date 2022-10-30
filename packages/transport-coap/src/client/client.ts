import { ExecptionFilter, Interceptor, RequestOptions, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { Connection, ConnectionOpts, ev, parseToDuplex, TransportClient, TransportClientOpts } from '@tsdi/transport';
import * as dgram from 'dgram';
import * as net from 'net'
import { Observable, Observer } from 'rxjs';
import { Duplex } from 'stream';
import { CoapPacketFactory, CoapVaildator } from '../transport';


@Abstract()
export abstract class CoapClientOpts extends TransportClientOpts {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract encoding?: BufferEncoding;
    abstract baseOn?: 'tcp' | 'udp';
    abstract connectOpts: dgram.SocketOptions | net.NetConnectOpts;
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
export class CoapClient extends TransportClient<RequestOptions, CoapClientOpts> {

    constructor(@Nullable() option: CoapClientOpts) {
        super(option);
    }

    protected override getDefaultOptions() {
        return defaults;
    }

    protected override createDuplex(opts: CoapClientOpts): Duplex {
        const socket = opts.baseOn === 'tcp' ? net.connect(opts.connectOpts as net.NetConnectOpts) : parseToDuplex(dgram.createSocket(opts.connectOpts as dgram.SocketOptions));
        return socket;
    }

    protected createConnection(duplex: Duplex, opts?: ConnectionOpts | undefined): Connection {
        const packet = this.context.get(CoapPacketFactory);
        return new Connection(duplex, packet, opts);
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
