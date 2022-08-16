import { Interceptor, ServerOpts } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { SessionOptions, ContentOptions, MimeSource, TransportServerOpts, ServerRequest, ServerResponse } from '@tsdi/transport';
import { ListenOptions, ServerOpts as NetServerOpts } from 'net';



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
    abstract serverOpts?: NetServerOpts | undefined;
    abstract listenOpts: ListenOptions;
}

/**
 * Tcp server interceptors.
 */
export const TCP_SERV_INTERCEPTORS = tokenId<Interceptor<ServerRequest, ServerResponse>[]>('TCP_SERV_INTERCEPTORS');
