import { HttpRequest, HttpResponse } from '@tsdi/common';
import { Interceptor } from '@tsdi/core';


/**
 * http Interceptor.
 */
export interface HttpInterceptor extends Interceptor<HttpRequest, HttpResponse> {

}

