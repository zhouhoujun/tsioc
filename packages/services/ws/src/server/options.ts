import { tokenId } from '@tsdi/ioc';
import { ApplicationEventContext, CanActivate, Filter, Interceptor } from '@tsdi/core';
import { Decoder, Encoder } from '@tsdi/common';
import { BindServerEvent, ServerOpts } from '@tsdi/endpoints';
import { ServerOptions } from 'ws';



/**
 * ws server options.
 */
export interface WsServerOpts extends ServerOpts<ServerOptions> {
    /**
     * heybird or not.
     */
    heybird?: boolean;
}

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


/**
 * Token of ws bind server interceptors.
 */
export const WS_BIND_INTERCEPTORS = tokenId<Interceptor<ApplicationEventContext<BindServerEvent>>[]>('WS_BIND_INTERCEPTORS');
/**
 * Token of ws bind server filters.
 */
export const WS_BIND_FILTERS = tokenId<Filter<ApplicationEventContext<BindServerEvent>>[]>('WS_BIND_FILTERS');
/**
 * WS bind server Guards.
 */
export const WS_BIND_GUARDS = tokenId<CanActivate<ApplicationEventContext<BindServerEvent>>[]>('WS_BIND_GUARDS');



/**
 * ws microservice encodings.
 */
export const WS_MICROSERVICE_ENCODINGS = tokenId<Encoder[]>('WS_MICROSERVICE_ENCODINGS');

/**
 * ws microservice decodings.
 */
export const WS_MICROSERVICE_DECODINGS = tokenId<Decoder[]>('WS_MICROSERVICE_DECODINGS');

