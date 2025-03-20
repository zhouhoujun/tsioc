import { tokenId } from '@tsdi/ioc';
import { ExecptionFilter, ApplicationInterceptor, GuardLike, Filter } from '@tsdi/core';
import { BindServerEvent, ServiceConfig } from '@tsdi/endpoints';
import { CoapServerOptions } from 'coap';


/**
 * Coap service config.
 */
export interface CoapServConfig extends ServiceConfig<CoapServerOptions> {
    listenOpts?: number | { host?: string, port?: number, listener?: () => void };
    detailError?: boolean;
    /**
     * heybird or not.
     */
    heybird?: boolean;
}

/**
 * CoAP server config token.
 */
export const COAP_SERV_OPTS = tokenId<CoapServConfig>('COAP_SERV_OPTS');

/**
 * CoAP server interceptors.
 */
export const COAP_SERV_INTERCEPTORS = tokenId<ApplicationInterceptor[]>('COAP_SERV_INTERCEPTORS');
/**
 * CoAP server filters.
 */
export const COAP_SERV_FILTERS = tokenId<ExecptionFilter[]>('COAP_SERV_FILTERS');
/**
 * CoAP Guards.
 */
export const COAP_SERV_GUARDS = tokenId<GuardLike[]>('COAP_SERV_GUARDS');



/**
 * Token of coap bind server interceptors.
 */
export const COAP_BIND_INTERCEPTORS = tokenId<ApplicationInterceptor<BindServerEvent>[]>('COAP_BIND_INTERCEPTORS');
/**
 * Token of tcp bind server filters.
 */
export const COAP_BIND_FILTERS = tokenId<Filter<BindServerEvent>[]>('COAP_BIND_FILTERS');
/**
 * Token of tcp bind server Guards.
 */
export const COAP_BIND_GUARDS = tokenId<GuardLike<BindServerEvent>[]>('COAP_BIND_GUARDS');

