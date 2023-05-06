import { Interceptor, TransportEvent, TransportRequest, ConfigableHandlerOptions, Filter, Client, ClientStreamOpts } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { SocketConstructorOpts, NetConnectOpts } from 'net';
import { ConnectionOptions } from 'tls';



/**
 * tcp client options.
 */
export interface TcpClientOpts extends ConfigableHandlerOptions<TransportRequest> {

    /**
     * keep alive
     */
    keepalive?: number;
    /**
     * client stream options.
     */
    streamOpts?: ClientStreamOpts;
    /**
     * socket options.
     */
    socketOpts?: SocketConstructorOpts;
    /**
     * connect options.
     */
    connectOpts?: NetConnectOpts | ConnectionOptions;
}

export interface TcpClientsOpts extends TcpClientOpts {
    /**
     * client token.
     */
    client: Token<Client>;
}


/**
 * TCP client opptions.
 */
export const TCP_CLIENT_OPTS = tokenId<TcpClientOpts>('TCP_CLIENT_OPTS');
/**
 * tcp client interceptors.
 */
export const TCP_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('TCP_CLIENT_INTERCEPTORS');
/**
 * tcp client filters.
 */
export const TCP_CLIENT_FILTERS = tokenId<Filter[]>('TCP_CLIENT_FILTERS');
