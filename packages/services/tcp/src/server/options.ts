import { Decoder, Encoder } from '@tsdi/common';
import { Interceptor, Filter, CanActivate, ApplicationEventContext } from '@tsdi/core';
import { BindServerEvent, MiddlewareLike, ServerOpts } from '@tsdi/endpoints';
import { tokenId } from '@tsdi/ioc';
import * as net from 'net';
import * as tls from 'tls';


/**
 * TCP server options.
 */
export interface TcpServerOpts extends ServerOpts<net.ServerOpts | tls.TlsOptions> {
    maxConnections?: number;
    listenOpts?: net.ListenOptions;
    /**
     * heybird or not.
     */
    heybird?: boolean;
}

/**
 * TCP server opptions.
 */
export const TCP_SERV_OPTS = tokenId<TcpServerOpts>('TCP_SERV_OPTS');

/**
 * Tcp server interceptors.
 */
export const TCP_SERV_INTERCEPTORS = tokenId<Interceptor[]>('TCP_SERV_INTERCEPTORS');


/**
 * tcp middlewares token.
 */
export const TCP_MIDDLEWARES = tokenId<MiddlewareLike[]>('TCP_MIDDLEWARES');

/**
 * TCP filters.
 */
export const TCP_SERV_FILTERS = tokenId<Filter[]>('TCP_SERV_FILTERS');

/**
 * TCP Guards.
 */
export const TCP_SERV_GUARDS = tokenId<CanActivate[]>('TCP_SERV_GUARDS');


/**
 * tcp server encodings.
 */
export const TCP_SERVER_ENCODINGS = tokenId<Encoder[]>('TCP_SERVER_ENCODINGS');

/**
 * tcp server decodings.
 */
export const TCP_SERVER_DECODINGS = tokenId<Decoder[]>('TCP_SERVER_DECODINGS');



/**
 * tcp microservice encodings.
 */
export const TCP_MICROSERVICE_ENCODINGS = tokenId<Encoder[]>('TCP_MICROSERVICE_ENCODINGS');

/**
 * tcp microservice decodings.
 */
export const TCP_MICROSERVICE_DECODINGS = tokenId<Decoder[]>('TCP_MICROSERVICE_DECODINGS');



/**
 * Token of tcp bind server interceptors.
 */
export const TCP_BIND_INTERCEPTORS = tokenId<Interceptor<ApplicationEventContext<BindServerEvent>>[]>('TCP_BIND_INTERCEPTORS');
/**
 * Token of tcp bind server filters.
 */
export const TCP_BIND_FILTERS = tokenId<Filter<ApplicationEventContext<BindServerEvent>>[]>('TCP_BIND_FILTERS');
/**
 * Token of tcp bind server Guards.
 */
export const TCP_BIND_GUARDS = tokenId<CanActivate<ApplicationEventContext<BindServerEvent>>[]>('TCP_BIND_GUARDS');

