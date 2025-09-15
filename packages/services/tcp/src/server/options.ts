import { tokenId } from '@tsdi/ioc';
import { ApplicationInterceptor, Filter, GuardLike } from '@tsdi/core';
import { BindServerEvent, ServiceConfig } from '@tsdi/endpoints';

import * as net from 'node:net';
import * as tls from 'node:tls';


/**
 * TCP service config.
 */
export interface TcpServConfig extends ServiceConfig<net.ServerOpts | tls.TlsOptions> {
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
export const TCP_SERV_INTERCEPTORS = tokenId<ApplicationInterceptor[]>('TCP_SERV_INTERCEPTORS');

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
export const TCP_BIND_INTERCEPTORS = tokenId<ApplicationInterceptor<BindServerEvent>[]>('TCP_BIND_INTERCEPTORS');
/**
 * Token of tcp bind server filters.
 */
export const TCP_BIND_FILTERS = tokenId<Filter<BindServerEvent>[]>('TCP_BIND_FILTERS');
/**
 * Token of tcp bind server Guards.
 */
export const TCP_BIND_GUARDS = tokenId<GuardLike<BindServerEvent>[]>('TCP_BIND_GUARDS');

