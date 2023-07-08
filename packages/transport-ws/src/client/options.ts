import { Client, ConfigableEndpointOptions, Filter, Interceptor, TransportEvent, TransportRequest, TransportSessionOpts } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { ClientOptions } from 'ws';

export interface WsClientOpts extends ConfigableEndpointOptions<TransportRequest> {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    url?: string;
    connectOpts?: ClientOptions;
    transportOpts?: TransportSessionOpts;
    timeout?: number;
}

export interface WsClientsOpts extends WsClientOpts {
    client: Token<Client>;
}

/**
 * WS client opptions.
 */
export const WS_CLIENT_OPTS = tokenId<WsClientOpts>('WS_CLIENT_OPTS');
/**
 * WS client interceptors.
 */
export const WS_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('WS_CLIENT_INTERCEPTORS');
/**
 * WS client filters.
 */
export const WS_CLIENT_FILTERS = tokenId<Filter[]>('WS_CLIENT_FILTERS');
