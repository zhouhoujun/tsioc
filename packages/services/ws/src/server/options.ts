import { tokenId } from '@tsdi/ioc';
import { GuardLike, Filter, ApplicationInterceptor } from '@tsdi/core';
import { TransportConfigure } from '@tsdi/common/transport';
import { BindServerEvent, ServiceConfig } from '@tsdi/endpoints';
import { ServerOptions } from 'ws';



/**
 * ws servic config.
 */
export interface WsServConfig extends ServiceConfig<ServerOptions> {
    /**
     * heybird or not.
     */
    heybird?: boolean;
    enableStream?: boolean;
    streamTransport?: TransportConfigure;

}

/**
 * Token of ws server interceptors.
 */
export const WS_SERV_INTERCEPTORS = tokenId<ApplicationInterceptor[]>('WS_SERV_INTERCEPTORS');

/**
 * Token of ws filters.
 */
export const WS_SERV_FILTERS = tokenId<Filter[]>('WS_SERV_FILTERS');
/**
 * WS Guards.
 */
export const WS_SERV_GUARDS = tokenId<GuardLike[]>('WS_SERV_GUARDS');


/**
 * Token of ws bind server interceptors.
 */
export const WS_BIND_INTERCEPTORS = tokenId<ApplicationInterceptor<BindServerEvent>[]>('WS_BIND_INTERCEPTORS');
/**
 * Token of ws bind server filters.
 */
export const WS_BIND_FILTERS = tokenId<Filter<BindServerEvent>[]>('WS_BIND_FILTERS');
/**
 * WS bind server Guards.
 */
export const WS_BIND_GUARDS = tokenId<GuardLike<BindServerEvent>[]>('WS_BIND_GUARDS');


