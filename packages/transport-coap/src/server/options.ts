
import { AssetContext, TransportEndpointOptions, ExecptionFilter, Interceptor, Outgoing, CanActivate, TransportSessionOpts } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ContentOptions } from '@tsdi/transport';
import { CoapServerOptions } from 'coap';


/**
 * Coap server options.
 */
export interface CoapServerOpts extends TransportEndpointOptions<AssetContext, Outgoing> {
    content?: ContentOptions;
    transportOpts?: TransportSessionOpts;
    connectOpts?: CoapServerOptions;
    listenOpts?: number | { host?:string, port?: number, listener?: () => void };
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
 * CoAP Guards.
 */
export const COAP_SERV_GUARDS = tokenId<CanActivate[]>('COAP_SERV_GUARDS');


/**
 * CoAP micro server options
 */
export const COAP_MICRO_SERV_OPTS = tokenId<CoapServerOpts>('COAP_MICRO_SERV_OPTS');
/**
 * CoAP micro server interceptors.
 */
export const COAP_MICRO_SERV_INTERCEPTORS = tokenId<Interceptor<AssetContext, Outgoing>[]>('COAP_MICRO_SERV_INTERCEPTORS');
/**
 * CoAP micro server filters.
 */
export const COAP_MICRO_SERV_FILTERS = tokenId<ExecptionFilter[]>('COAP_MICRO_SERV_FILTERS');
/**
 * CoAP micro Guards.
 */
export const COAP_MICRO_SERV_GUARDS = tokenId<CanActivate[]>('COAP_MICRO_SERV_GUARDS');
