import { Endpoint, EndpointContext, Interceptor } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Observable, map } from 'rxjs';
import { Encoder } from '../transformer';

@Injectable()
export class EncodeInterceptor<TRequest = any, TResponse = any> implements Interceptor<TRequest, TResponse> {

    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, context: EndpointContext): Observable<TResponse> {
        return next.handle(req, context)
            .pipe(
                map(res => context.get(Encoder).encode(res))
            );
    }

}
