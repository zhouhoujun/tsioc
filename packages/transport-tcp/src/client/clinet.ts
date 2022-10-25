import { OnDispose, RequestOptions } from '@tsdi/core';
import { Injectable, Nullable } from '@tsdi/ioc';
import { TcpClientOpts, TCP_CLIENT_EXECPTION_FILTERS, TCP_CLIENT_INTERCEPTORS } from './options';
import { Connection, ConnectionOpts, ev, Packetor, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { TcpIncomingUtil } from '../transport';
import { Duplex } from 'stream';
import * as net from 'net';
import * as tls from 'tls';
import { Observable, Observer } from 'rxjs';



/**
 * tcp client default options.
 */
export const TCP_CLIENT_OPTS = {
    transport: {
        strategy: TcpIncomingUtil
    },
    interceptorsToken: TCP_CLIENT_INTERCEPTORS,
    execptionFiltersToken: TCP_CLIENT_EXECPTION_FILTERS,
    connectionOpts: {
        delimiter: '\r\n',
        maxSize: 10 * 1024 * 1024,
    },
} as TcpClientOpts;


/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable()
export class TcpClient extends TransportClient<RequestOptions> implements OnDispose {
    constructor(@Nullable() options: TcpClientOpts) {
        super(options);
    }

    protected override getDefaultOptions() {
        return TCP_CLIENT_OPTS;
    }

    protected override createDuplex(opts: TransportClientOpts): Duplex {
        const socket = (opts.connectOpts as tls.ConnectionOptions).cert ? tls.connect(opts.connectOpts as tls.ConnectionOptions) : net.connect(opts.connectOpts as net.NetConnectOpts);
        return socket;
    }

    
    protected onConnect(duplex: Duplex, opts?: ConnectionOpts): Observable<Connection> {
        const logger = this.logger;
        const packetor = this.context.get(Packetor);
        return new Observable((observer: Observer<Connection>) => {
            const client = new Connection(duplex, packetor, opts);
            if (opts?.keepalive) {
                client.setKeepAlive(true, opts.keepalive);
            }

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
            client.on(ev.ERROR, onError);
            client.on(ev.CLOSE, onClose);
            client.on(ev.END, onClose);
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

