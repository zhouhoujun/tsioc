import { OnDispose, RequestOptions } from '@tsdi/core';
import { Injectable, Nullable } from '@tsdi/ioc';
import { Connection, ConnectionOpts, ev, TransportConnection, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { TcpClientOpts, TCP_CLIENT_EXECPTION_FILTERS, TCP_CLIENT_INTERCEPTORS } from './options';
import { Duplex } from 'stream';
import * as net from 'net';
import * as tls from 'tls';
import { TcpBackend } from './backend';
import { TcpPackFactory } from '../transport';



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

    protected override createSocket(opts: TransportClientOpts): Duplex {
        const socket = (opts.connectOpts as tls.ConnectionOptions).cert ? tls.connect(opts.connectOpts as tls.ConnectionOptions) : net.connect(opts.connectOpts as net.NetConnectOpts);
        return socket;
    }

    protected createConnection(socket: Duplex, opts?: ConnectionOpts | undefined): Connection {
        const packet = this.context.get(TcpPackFactory);
        const conn = new TransportConnection(socket, packet, opts);
        if (opts?.keepalive) {
            conn.setKeepAlive(true, opts.keepalive);
        }
        return conn
    }

}

