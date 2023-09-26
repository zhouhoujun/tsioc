import { tokenId } from '@tsdi/ioc';
import { Filter, Interceptor } from '@tsdi/core';
import { TransportRequest, TransportEvent } from '@tsdi/common';
import { ClientOpts, MicroClientOpts } from '@tsdi/common/client';
import { ClientOptions } from 'ws';

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



export interface WsMicroClientOpts extends MicroClientOpts<ClientOptions> {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    url?: string;
}


/**
 * WS client opptions.
 */
export const WS_MICRO_CLIENT_OPTS = tokenId<WsMicroClientOpts>('WS_MICRO_CLIENT_OPTS');
/**
 * WS client interceptors.
 */
export const WS_MICRO_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('WS_MICRO_CLIENT_INTERCEPTORS');
/**
 * WS client filters.
 */
export const WS_MICRO_CLIENT_FILTERS = tokenId<Filter[]>('WS_MICRO_CLIENT_FILTERS');
