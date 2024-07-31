import { tokenId } from '@tsdi/ioc';
import { Interceptor, Filter, GuardLike } from '@tsdi/core';
import { BindServerEvent, MiddlewareLike, ServerOpts } from '@tsdi/endpoints';

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
export const TCP_SERV_GUARDS = tokenId<GuardLike[]>('TCP_SERV_GUARDS');


/**
 * Token of tcp bind server interceptors.
 */
export const TCP_BIND_INTERCEPTORS = tokenId<Interceptor<BindServerEvent>[]>('TCP_BIND_INTERCEPTORS');
/**
 * Token of tcp bind server filters.
 */
export const TCP_BIND_FILTERS = tokenId<Filter<BindServerEvent>[]>('TCP_BIND_FILTERS');
/**
 * Token of tcp bind server Guards.
 */
export const TCP_BIND_GUARDS = tokenId<GuardLike<BindServerEvent>[]>('TCP_BIND_GUARDS');

