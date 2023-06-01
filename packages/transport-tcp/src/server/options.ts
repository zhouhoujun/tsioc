import { Interceptor, Filter, MiddlewareLike, AssetContext, MiddlewareEndpointOptions, Incoming, Outgoing, TransportSessionOpts, ConfigableEndpointOptions, CanActivate } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { SessionOptions, ContentOptions, MimeSource, ProxyOpts } from '@tsdi/transport';
import * as net from 'net';
import * as tls from 'tls';
import { TcpContext } from './context';



/**
 * TCP server options.
 */
export interface TcpServerOpts extends MiddlewareEndpointOptions<TcpContext, Outgoing> {

    autoListen?: boolean;
    maxConnections?: number;
    proxy?: ProxyOpts;
    /**
     * transport session options.
     */
    transportOpts?: TransportSessionOpts;
    /**
     * socket timeout.
     */
    timeout?: number;
    mimeDb?: Record<string, MimeSource>;
    content?: boolean | ContentOptions;
    session?: boolean | SessionOptions;
    serverOpts?: net.ServerOpts | tls.TlsOptions;
    listenOpts: net.ListenOptions;
    detailError?: boolean;
}

/**
 * TCP Microservice options.
 */
export interface TcpMicroServiceOpts extends ConfigableEndpointOptions<TcpContext, Outgoing> {

    autoListen?: boolean;
    maxConnections?: number;
    proxy?: ProxyOpts;
    /**
     * transport session options.
     */
    transportOpts?: TransportSessionOpts;
    /**
     * socket timeout.
     */
    timeout?: number;
    mimeDb?: Record<string, MimeSource>;
    content?: boolean | ContentOptions;
    session?: boolean | SessionOptions;
    serverOpts?: net.ServerOpts | tls.TlsOptions;
    listenOpts: net.ListenOptions;

    detailError?: boolean;
}

/**
 * TCP server opptions.
 */
export const TCP_SERV_OPTS = tokenId<TcpServerOpts>('TCP_SERV_OPTS');

/**
 * Tcp server interceptors.
 */
export const TCP_SERV_INTERCEPTORS = tokenId<Interceptor<Incoming, Outgoing>[]>('TCP_SERV_INTERCEPTORS');

/**
 * TCP Middlewares.
 */
export const TCP_SERV_MIDDLEWARES = tokenId<MiddlewareLike<AssetContext>[]>('TCP_SERV_MIDDLEWARES');
/**
 * TCP execption filters.
 */
export const TCP_SERV_FILTERS = tokenId<Filter<Incoming, Outgoing>[]>('TCP_SERV_FILTERS');

/**
 * TCP Guards.
 */
export const TCP_SERV_GUARDS = tokenId<CanActivate[]>('TCP_SERV_GUARDS');

