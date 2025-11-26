import { AbstractRequest, RequestContext, RequestHandlerFn, RequestInterceptorFn, ResponseFactory } from '@tsdi/common';
import { catchError, throwError, timeout } from 'rxjs';


/**
 * request body content interceptor.
 */
export const requestTimeoutInterceptor: RequestInterceptorFn = (input: AbstractRequest<any>, next: RequestHandlerFn, context: RequestContext) => {
    if (input.timeout) {
        return next(input, context)
            .pipe(
                timeout(input.timeout),
                catchError(err => {
                    if (err.name == 'TimeoutError') {
                        const factory = context.get(ResponseFactory);
                        return throwError(() => factory ? factory.create({ headers: {}, error: err, ok: false }) : err);
                    }
                    return throwError(() => err);
                })
            )
    }
    return next(input, context)
}

