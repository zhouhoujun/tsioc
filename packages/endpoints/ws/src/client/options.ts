import { Token, tokenId } from '@tsdi/ioc';
import { ConfigableEndpointOptions, Filter, Interceptor } from '@tsdi/core';
import { TransportRequest, TransportEvent, TransportOpts } from '@tsdi/common';
import { Client } from '@tsdi/common/client';
import { ClientOptions } from 'ws';

export interface WsClientOpts extends ConfigableEndpointOptions<TransportRequest> {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    url?: string;
    connectOpts?: ClientOptions;
    transportOpts?: TransportOpts;
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
