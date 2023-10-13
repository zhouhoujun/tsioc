import { tokenId } from '@tsdi/ioc';
import { CanActivate, Filter, Interceptor } from '@tsdi/core';
import { ServerOpts } from '@tsdi/endpoints';
import { ServerOptions } from 'ws';




export interface WsServerOpts extends ServerOpts<ServerOptions> {

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

