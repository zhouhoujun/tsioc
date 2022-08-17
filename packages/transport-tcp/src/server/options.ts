import { Interceptor } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { SessionOptions, ContentOptions, MimeSource, TransportServerOpts, ServerRequest, ServerResponse } from '@tsdi/transport';
import * as net from 'net';
import * as tls from 'tls';



/**
 * TCP server options.
 */
@Abstract()
export abstract class TcpServerOpts extends TransportServerOpts {

    abstract maxConnections?: number;
    abstract proxy?: boolean;
    /**
     * socket timeout.
     */
    abstract timeout?: number;
    abstract mimeDb?: Record<string, MimeSource>;
    abstract content?: boolean | ContentOptions;
    abstract session?: boolean | SessionOptions;
    abstract serverOpts?: net.ServerOpts | tls.TlsOptions;
    abstract listenOpts: net.ListenOptions;
}

/**
 * Tcp server interceptors.
 */
export const TCP_SERV_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('TCP_SERV_INTERCEPTORS');
