import { token } from '@tsdi/ioc';
import { Interceptor, Filter, CanHandle } from '@tsdi/core';

import { HttpContext, HttpServResponse } from './context';



export const HTTP_SERV_FILTERS = token<Filter[]>('HTTP_SERV_FILTERS');

/**
 * http server ApplicationInterceptor tokens for {@link HttpServer}.
 */
export const HTTP_SERV_INTERCEPTORS = token<Interceptor<HttpContext, HttpServResponse>[]>('HTTP_SERV_INTERCEPTORS');

/**
 * HTTP Guards.
 */
export const HTTP_SERV_GUARDS = token<CanHandle<HttpContext>[]>('HTTP_SERV_GUARDS');