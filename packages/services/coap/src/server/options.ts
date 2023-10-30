import { tokenId } from '@tsdi/ioc';
import { ExecptionFilter, Interceptor, CanActivate } from '@tsdi/core';
import { ServerOpts } from '@tsdi/endpoints';
import { CoapServerOptions } from 'coap';


/**
 * Coap server options.
 */
export interface CoapServerOpts extends ServerOpts<CoapServerOptions> {
    listenOpts?: number | { host?: string, port?: number, listener?: () => void };
    detailError?: boolean;
}

/**
 * CoAP server options
 */
export const COAP_SERV_OPTS = tokenId<CoapServerOpts>('COAP_SERV_OPTS');

/**
 * CoAP server interceptors.
 */
export const COAP_SERV_INTERCEPTORS = tokenId<Interceptor[]>('COAP_SERV_INTERCEPTORS');
/**
 * CoAP server filters.
 */
export const COAP_SERV_FILTERS = tokenId<ExecptionFilter[]>('COAP_SERV_FILTERS');
/**
 * CoAP Guards.
 */
export const COAP_SERV_GUARDS = tokenId<CanActivate[]>('COAP_SERV_GUARDS');



