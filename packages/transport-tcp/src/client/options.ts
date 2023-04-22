import { Interceptor, TransportEvent, TransportRequest, ConfigableHandlerOptions, Filter } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { SocketConstructorOpts, NetConnectOpts } from 'net';
import { ConnectionOptions } from 'tls';



/**
 * tcp client options.
 */
export interface TcpClientOpts extends ConfigableHandlerOptions<TransportRequest> {
    /**
     * packet size limit.
     */
    sizeLimit?: number;
    /**
     * packet buffer encoding.
     */
    encoding?: BufferEncoding;
    /**
     * packet delimiter code.
     */
    delimiter?: string;
    /**
     * socket options.
     */
    socketOpts?: SocketConstructorOpts;
    /**
     * connect options.
     */
    connectOpts?: NetConnectOpts | ConnectionOptions;
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
