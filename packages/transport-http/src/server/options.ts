import { Interceptor, Filter, MiddlewareEndpointOptions, CanActivate } from '@tsdi/core';
import { tokenId, Type } from '@tsdi/ioc';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { ListenOptions } from 'net';
import { CorsOptions, MimeSource, ContentOptions, SessionOptions, CsrfOptions, ProxyOpts } from '@tsdi/transport';
import { HttpServRequest, HttpServResponse } from './context';

/**
 * http options.
 */
export interface HttpOpts extends MiddlewareEndpointOptions {
    majorVersion?: number;
    proxy?: ProxyOpts;
    /**
     * request timeout.
     */
    timeout?: number;
    detailError?: boolean;
    cors?: boolean | CorsOptions;
    mimeDb?: Record<string, MimeSource>;
    content?: boolean | ContentOptions;
    session?: boolean | SessionOptions;
    controllers?: string[] | Type[];
    autoListen?: boolean;
    listenOpts?: ListenOptions;
    csrf?: boolean | CsrfOptions;
}

export interface Http1ServerOpts extends HttpOpts {
    majorVersion: 1,
    protocol?: 'http' | 'https';
    serverOpts?: http.ServerOptions | https.ServerOptions;
}
export interface Http2ServerOpts extends HttpOpts {
    majorVersion: 2,
    protocol?: 'http' | 'https';
    serverOpts?: http2.ServerOptions | http2.SecureServerOptions;
}

/**
 * http server options.
 */
export type HttpServerOpts = Http1ServerOpts | Http2ServerOpts;


/**
 * http server opptions.
 */
export const HTTP_SERV_OPTS = tokenId<HttpServerOpts>('HTTP_SERVER_OPTS');

export const HTTP_SERV_FILTERS = tokenId<Filter[]>('HTTP_SERV_FILTERS');

/**
 * http server Interceptor tokens for {@link HttpServer}.
 */
export const HTTP_SERV_INTERCEPTORS = tokenId<Interceptor<HttpServRequest, HttpServResponse>[]>('HTTP_SERV_INTERCEPTORS');

/**
 * HTTP Guards.
 */
export const HTTP_SERV_GUARDS = tokenId<CanActivate[]>('HTTP_SERV_GUARDS');