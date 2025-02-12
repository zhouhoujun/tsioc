import { Injectable } from '@tsdi/ioc';
import { Handler, Interceptor } from '@tsdi/core';
import { AbstractRequest, ResponseEvent } from '@tsdi/common';
import { Observable, timeout } from 'rxjs';



/**
 * request body content interceptor.
 */
@Injectable()
export class RequestTimeoutInterceptor<TRequest extends AbstractRequest<any> = AbstractRequest<any>, TResponse = ResponseEvent<any>> implements Interceptor<TRequest, TResponse> {

    constructor() { }
    intercept(input: TRequest, next: Handler, context?: any): Observable<TResponse> {
        if (input.timeout) {
            return next.handle(input, context).pipe(timeout(input.timeout))
        }
        return next.handle(input, context)
    }

}