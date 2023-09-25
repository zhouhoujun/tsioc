import { tokenId } from '@tsdi/ioc';
import { CanActivate, Filter, Interceptor } from '@tsdi/core';
import { MicroServiceOpts } from '@tsdi/endpoints';
import { ContentOptions, MimeSource } from '@tsdi/endpoints/assets';
import { ServerOptions } from 'ws';




export interface WsServerOpts extends MicroServiceOpts<ServerOptions> {
    mimeDb?: Record<string, MimeSource>;
    content?: boolean | ContentOptions;
}

/**
 * Token of ws server opptions.
 */
export const WS_SERV_OPTS = tokenId<WsServerOpts>('WS_SERV_OPTS');
/**
 * Token of ws server interceptors.
 */
export const WS_SERV_INTERCEPTORS = tokenId<Interceptor[]>('WS_SERV_INTERCEPTORS');

/**
 * Token of ws filters.
 */
export const WS_SERV_FILTERS = tokenId<Filter[]>('WS_SERV_FILTERS');

/**
 * WS Guards.
 */
export const WS_SERV_GUARDS = tokenId<CanActivate[]>('WS_SERV_GUARDS');

