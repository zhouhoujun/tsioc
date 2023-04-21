import { AbstractGuardHandler, Client, OnDispose, Pattern, RequestOptions, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, Injectable, lang, Nullable } from '@tsdi/ioc';
import { Connection, ev, DuplexConnection } from '@tsdi/transport';
import * as net from 'net';
import * as tls from 'tls';
import { TcpClientOpts, TCP_CLIENT_EXECPTION_FILTERS, TCP_CLIENT_INTERCEPTORS } from './options';
import { TcpBackend } from './backend';
import { TcpPackFactory } from '../transport';
import { Observable } from 'rxjs';



/**
 * tcp client default options.
 */
export const TCP_CLIENT_OPTS = {
    backend: TcpBackend,
    interceptorsToken: TCP_CLIENT_INTERCEPTORS,
    filtersToken: TCP_CLIENT_EXECPTION_FILTERS,
    connectionOpts: {
        events: [ev.CONNECT],
        delimiter: '\r\n',
        maxSize: 10 * 1024 * 1024,
    },
} as TcpClientOpts;


@Abstract()
export abstract class TcpGuardHandler extends AbstractGuardHandler<TransportRequest, TransportEvent> {

}

/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable()
export class TcpClient extends Client<TransportRequest, RequestOptions> {

    private options: TcpClientOpts;
    constructor(readonly handler: TcpGuardHandler, @Nullable() options: TcpClientOpts) {
        super();
        this.options = { ...TCP_CLIENT_OPTS, ...options }
    }

    private connection: Connection<tls.TLSSocket | net.Socket>;
    protected connect(): Promise<any> | Observable<any> {
        
    }

    close(): Promise<void> {
        const defer = lang.defer();
        this.connection.destroy(null, err => err ? defer.reject(err) : defer.resolve());
        return defer.promise;
    }

    protected isValid(connection: Connection<tls.TLSSocket | net.Socket>): boolean {
        return !connection.destroyed && !connection.isClosed
    }

    protected override createConnection(opts: TcpClientOpts): Connection<tls.TLSSocket | net.Socket> {
        const socket = (opts.connectOpts as tls.ConnectionOptions).cert ? tls.connect(opts.connectOpts as tls.ConnectionOptions) : net.connect(opts.connectOpts as net.NetConnectOpts);
        const packet = this.handler.injector.get(TcpPackFactory);
        const conn = new DuplexConnection(socket, packet, { events: [ev.CONNECT], ...opts.connectionOpts });
        if (opts?.keepalive) {
            conn.setKeepAlive(true, opts.keepalive);
        }
        return conn
    }

}

