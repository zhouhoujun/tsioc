import { Endpoint, Interceptor } from '@tsdi/core';
import { Injectable, InvocationContext } from '@tsdi/ioc';
import { Observable, map } from 'rxjs';
import { Transformer } from '../transformer';

@Injectable()
export class EncodeInterceptor<TRequest = any, TResponse = any> implements Interceptor<TRequest, TResponse> {

    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, context: InvocationContext<any>): Observable<TResponse> {
        return next.handle(req, context)
            .pipe(
                map(res=> context.get(Transformer).encode(res))
            );
    }

}
