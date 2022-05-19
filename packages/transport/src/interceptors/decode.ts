import { Endpoint, Interceptor } from '@tsdi/core';
import { Injectable, InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Transformer } from '../transformer';

@Injectable()
export class DecodeInterceptor<TRequest = any, TResponse = any> implements Interceptor<TRequest, TResponse> {

    intercept(req: TRequest, next: Endpoint<TRequest, TResponse>, context: InvocationContext<any>): Observable<TResponse> {
        return next.handle(context.get(Transformer).decode(req), context);
    }

}
