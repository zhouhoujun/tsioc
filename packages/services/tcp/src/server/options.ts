import { token } from '@tsdi/ioc';
import { Filter, GuardLike } from '@tsdi/core';
import { RequestInterceptorLike } from '@tsdi/common';
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
export const TCP_SERV_INTERCEPTORS = token<RequestInterceptorLike[]>('TCP_SERV_INTERCEPTORS');

/**
 * TCP filters.
 */
export const TCP_SERV_FILTERS = token<Filter[]>('TCP_SERV_FILTERS');

/**
 * TCP Guards.
 */
export const TCP_SERV_GUARDS = token<GuardLike[]>('TCP_SERV_GUARDS');


/**
 * Token of tcp bind server interceptors.
 */
export const TCP_BIND_INTERCEPTORS = token<RequestInterceptorLike<BindServerEvent>[]>('TCP_BIND_INTERCEPTORS');
/**
 * Token of tcp bind server filters.
 */
export const TCP_BIND_FILTERS = token<Filter<BindServerEvent>[]>('TCP_BIND_FILTERS');
/**
 * Token of tcp bind server Guards.
 */
export const TCP_BIND_GUARDS = token<GuardLike<BindServerEvent>[]>('TCP_BIND_GUARDS');

