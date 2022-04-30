import { Abstract, tokenId } from '@tsdi/ioc';
import { Endpoint, HttpRequest, HttpResponse, Interceptor } from '@tsdi/core';
import { Observable } from 'rxjs';


/**
 * http Interceptor.
 */
export interface HttpInterceptor extends Interceptor<HttpRequest, HttpResponse> {

}

