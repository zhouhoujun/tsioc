import { tokenId } from '@tsdi/ioc';
import { ApplicationInterceptor, Filter, CanHandle } from '@tsdi/core';
import { MiddlewareLike } from '@tsdi/endpoints';

import { HttpContext, HttpServResponse } from './context';



export const HTTP_SERV_FILTERS = tokenId<Filter[]>('HTTP_SERV_FILTERS');

/**
 * http server ApplicationInterceptor tokens for {@link HttpServer}.
 */
export const HTTP_SERV_INTERCEPTORS = tokenId<ApplicationInterceptor<HttpContext, HttpServResponse>[]>('HTTP_SERV_INTERCEPTORS');

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