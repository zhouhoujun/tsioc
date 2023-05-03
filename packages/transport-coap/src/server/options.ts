
import { AssetContext, AssetEndpointOptions, ExecptionFilter, Interceptor, MiddlewareLike, Outgoing } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import * as net from 'net';
import * as dgram from 'dgram';



/**
 * Coap server options.
 */
export interface CoapServerOpts extends AssetEndpointOptions<AssetContext, Outgoing> {
    /**
     * is json or not.
     */
    json?: boolean;
    baseOn?: 'tcp' | 'udp';
    encoding?: BufferEncoding;
    serverOpts: dgram.SocketOptions | net.ServerOpts;
    listenOpts?: net.ListenOptions;
}

export const COAP_SERVER_OPTS = tokenId<CoapServerOpts>('COAP_SERVER_OPTS');

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
