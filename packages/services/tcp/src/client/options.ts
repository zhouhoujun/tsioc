import { Interceptor, Filter } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { TransportRequest, TransportEvent, Encoder, Decoder } from '@tsdi/common';
import { ClientOpts } from '@tsdi/common/client';
import { ConnectionOptions } from 'tls';
import { SocketConstructorOpts, NetConnectOpts } from 'net';



/**
 * tcp client options.
 */
export interface TcpClientOpts extends ClientOpts<NetConnectOpts | ConnectionOptions> {
    /**
     * keep alive
     */
    keepalive?: number;
    /**
     * socket options.
     */
    socketOpts?: SocketConstructorOpts;
}


/**
 * tcp client interceptors.
 */
export const TCP_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('TCP_CLIENT_INTERCEPTORS');
/**
 * tcp client filters.
 */
export const TCP_CLIENT_FILTERS = tokenId<Filter[]>('TCP_CLIENT_FILTERS');
