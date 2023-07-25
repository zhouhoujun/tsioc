import { Client, ConfigableEndpointOptions, Filter, Interceptor, TransportSessionOpts } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { TransportRequest, TransportEvent } from '@tsdi/common';
import { SocketOptions } from 'dgram';


export interface UdpClientOpts extends ConfigableEndpointOptions<TransportRequest> {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    url?: string;
    connectOpts?: SocketOptions;
    transportOpts?: TransportSessionOpts;
    timeout?: number;
}

export interface UdpClientsOpts extends UdpClientOpts {
    client: Token<Client>;
}

/**
 * UDP client opptions.
 */
export const UDP_CLIENT_OPTS = tokenId<UdpClientOpts>('UDP_CLIENT_OPTS');
/**
 * UDP client interceptors.
 */
export const UDP_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('UDP_CLIENT_INTERCEPTORS');
/**
 * UDP client filters.
 */
export const UDP_CLIENT_FILTERS = tokenId<Filter[]>('UDP_CLIENT_FILTERS');
