import { AbstractRequest, RequestContext, RequestHandlerFn, RequestInterceptorFn, ResponseFactory } from '@tsdi/common';
import { catchError, throwError, timeout } from 'rxjs';


/**
 * request body content interceptor.
 */
export function requestTimeoutInterceptor(milliseconds: number): RequestInterceptorFn {
    return (input: AbstractRequest<any>, next: RequestHandlerFn, context: RequestContext) => {

        return next(input, context)
            .pipe(
                timeout(milliseconds),
                catchError(err => {
                    if (err.name == 'TimeoutError') {
                        const factory = context.get(ResponseFactory);
                        return throwError(() => factory ? factory.create({ headers: {}, error: err, ok: false }) : err);
                    }
                    return throwError(() => err);
                })
            )

    }
}

