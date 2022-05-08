import { HttpRequest, HttpResponse, Interceptor } from '@tsdi/core';


/**
 * http Interceptor.
 */
export interface HttpInterceptor extends Interceptor<HttpRequest, HttpResponse> {

}

