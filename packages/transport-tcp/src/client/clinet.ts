import { OnDispose, RequestOptions } from '@tsdi/core';
import { Injectable, Nullable } from '@tsdi/ioc';
import { TcpClientOpts, TCP_CLIENT_EXECPTION_FILTERS, TCP_CLIENT_INTERCEPTORS } from './options';
import { Connection, ConnectionOpts, ev, PacketFactory, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Duplex } from 'stream';
import * as net from 'net';
import * as tls from 'tls';
import { HttpStatusFactory } from '@tsdi/transport-http';



/**
 * tcp client default options.
 */
export const TCP_CLIENT_OPTS = {
    statusFactory: HttpStatusFactory,
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

    protected createConnection(socket: Duplex, opts?: ConnectionOpts | undefined): Connection {
        const packet = this.context.get(PacketFactory);
        const conn = new Connection(socket, packet, opts);
        if (opts?.keepalive) {
            conn.setKeepAlive(true, opts.keepalive);
        }
        return conn
    }

}

