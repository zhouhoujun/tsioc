import { tokenId } from '@tsdi/ioc';
import { Filter, Interceptor } from '@tsdi/core';
import { TransportRequest, TransportEvent } from '@tsdi/common';
import { ClientOpts } from '@tsdi/common/client';
import { ClientOptions } from 'ws';

/**
 * ws client options.
 */
export interface WsClientOpts extends ClientOpts<ClientOptions> {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    url?: string;
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
