import { tokenId } from '@tsdi/ioc';
import { Interceptor, Filter, CanHandle } from '@tsdi/core';
import { MiddlewareLike } from '@tsdi/endpoints';

import { HttpContext, HttpServResponse } from './context';



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
export const HTTP_SERV_GUARDS = tokenId<CanHandle<HttpContext>[]>('HTTP_SERV_GUARDS');