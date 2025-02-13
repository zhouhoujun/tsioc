import { HandlerFn, InterceptorFn } from '@tsdi/core';
import { AbstractRequest } from '@tsdi/common';
import { timeout } from 'rxjs';



/**
 * request body content interceptor.
 */
export const requestTimeoutInterceptor: InterceptorFn = (input: AbstractRequest<any>, next: HandlerFn, context?: any) => {
    if (input.timeout) {
        return next(input, context).pipe(timeout(input.timeout))
    }
    return next(input, context)
}

