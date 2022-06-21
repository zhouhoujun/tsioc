import { Endpoint, Interceptor, EndpointContext } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Decoder } from '../transformer';

@Injectable()
export class DecodeInterceptor<TRequest = any, TResponse = any> implements Interceptor<TRequest, TResponse> {

    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, context: EndpointContext): Observable<TResponse> {
        return next.handle(context.get(Decoder).decode(req), context);
    }

}
