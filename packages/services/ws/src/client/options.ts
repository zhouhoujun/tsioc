import { tokenId } from '@tsdi/ioc';
import { Filter, Interceptor } from '@tsdi/core';
import { PatternRequest, ResponseEvent } from '@tsdi/common';
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
 * WS client interceptors.
 */
export const WS_CLIENT_INTERCEPTORS = tokenId<Interceptor<PatternRequest, ResponseEvent>[]>('WS_CLIENT_INTERCEPTORS');
/**
 * WS client filters.
 */
export const WS_CLIENT_FILTERS = tokenId<Filter[]>('WS_CLIENT_FILTERS');


