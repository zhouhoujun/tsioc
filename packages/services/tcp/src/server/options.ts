import { Interceptor, Filter, CanActivate } from '@tsdi/core';
import { MiddlewareLike, ServerOpts } from '@tsdi/endpoints';
import { tokenId } from '@tsdi/ioc';
import * as net from 'net';
import * as tls from 'tls';


/**
 * TCP server options.
 */
export interface TcpServerOpts extends ServerOpts<net.ServerOpts | tls.TlsOptions> {
    maxConnections?: number;
    listenOpts?: net.ListenOptions;
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


