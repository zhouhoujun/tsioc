import { tokenId, Type } from '@tsdi/ioc';
import { Interceptor, Filter, CanActivate } from '@tsdi/core';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { ListenOptions } from 'net';
import { ContentOptions, SessionOptions, ProxyOpts, ServerOpts, MiddlewareLike } from '@tsdi/endpoints';
import { CorsOptions, MimeSource, CsrfOptions, } from '@tsdi/endpoints/assets';
import { HttpContext, HttpServResponse } from './context';

/**
 * http options.
 */
export interface HttpOpts extends ServerOpts {
    majorVersion?: number;
    proxy?: ProxyOpts;
    /**
     * request timeout.
     */
    timeout?: number;
    detailError?: boolean;
    cors?: boolean | CorsOptions;
    mimeDb?: Record<string, MimeSource>;
    content?: ContentOptions;
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
export const HTTP_SERV_INTERCEPTORS = tokenId<Interceptor<HttpContext, HttpServResponse>[]>('HTTP_SERV_INTERCEPTORS');

/**
 * http middleware.
 */
export type HttpMiddleware = MiddlewareLike<HttpContext>;

/**
 * http middlewares token.
 */
export const HTTP_MIDDLEWARES = tokenId<HttpMiddleware[]>('HTTP_MIDDLEWARES');

/**
 * HTTP Guards.
 */
export const HTTP_SERV_GUARDS = tokenId<CanActivate<HttpContext>[]>('HTTP_SERV_GUARDS');