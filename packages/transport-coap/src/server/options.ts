
import { AssetContext, TransportEndpointOptions, ExecptionFilter, Interceptor, MiddlewareLike, Outgoing, CanActivate } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { CoapServerOptions } from 'coap';


/**
 * Coap server options.
 */
export interface CoapServerOpts extends TransportEndpointOptions<AssetContext, Outgoing> {
    encoding?: BufferEncoding;
    connectOpts?: CoapServerOptions;
    listenOpts?: number | { port?: number, listener?: () => void };
    detailError?: boolean;
}

export const COAP_SERV_OPTS = tokenId<CoapServerOpts>('COAP_SERV_OPTS');

/**
 * CoAP server interceptors.
 */
export const COAP_SERV_INTERCEPTORS = tokenId<Interceptor<AssetContext, Outgoing>[]>('COAP_SERV_INTERCEPTORS');

/**
 * CoAP server filters.
 */
export const COAP_SERV_FILTERS = tokenId<ExecptionFilter[]>('COAP_SERV_FILTERS');
/**
 * CoAP middlewares.
 */
export const COAP_MIDDLEWARES = tokenId<MiddlewareLike[]>('COAP_MIDDLEWARES');
/**
 * CoAP Guards.
 */
export const COAP_SERV_GUARDS = tokenId<CanActivate[]>('COAP_SERV_GUARDS');

