import { tokenId, Type } from '@tsdi/ioc';
import { Interceptor, Filter, CanActivate } from '@tsdi/core';
import { MimeSource } from '@tsdi/common/transport';
import { ContentOptions, ProxyOpts, ServerOpts, MiddlewareLike } from '@tsdi/endpoints';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { ListenOptions } from 'net';

import { HttpContext, HttpServResponse } from './context';
import { CorsOptions } from './interceptors/cors';
import { CsrfOptions } from './interceptors/csrf';

/**
 * http options.
 */
export interface HttpOpts extends ServerOpts {
    proxy?: ProxyOpts;
    cors?: boolean | CorsOptions;
    mimeDb?: Record<string, MimeSource>;
    content?: ContentOptions;
    controllers?: string[] | Type[];
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