import { OnDispose, RequestOptions } from '@tsdi/core';
import { Injectable, Nullable } from '@tsdi/ioc';
import { TcpClientOpts, TCP_EXECPTIONFILTERS, TCP_INTERCEPTORS } from './options';
import { TransportClient, TransportClientOpts } from '@tsdi/transport';
import { TcpProtocol } from '../protocol';
import { Duplex } from 'stream';
import * as net from 'net';
import * as tls from 'tls';



/**
 * tcp client default options.
 */
export const TCP_CLIENT_OPTS = {
    transport: TcpProtocol,
    interceptorsToken: TCP_INTERCEPTORS,
    execptionsToken: TCP_EXECPTIONFILTERS,
    connectionOpts: {
        delimiter: '\r\n',
        maxSize: 10 * 1024 * 1024,
        highWaterMark: 16 * 1024
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

}

