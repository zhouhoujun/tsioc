import { RequestContext, RequestHandlerFn, RequestInterceptorFn, ResponseFactory } from '@tsdi/common';
import { catchError, throwError, timeout } from 'rxjs';

/**
 * Request timeout interceptor.
 * 请求超时拦截器
 *
 * @param milliseconds timeout duration in milliseconds.
 */
export function requestTimeoutInterceptor(milliseconds: number): RequestInterceptorFn {
    return (input: any, next: RequestHandlerFn, context: RequestContext) => {
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
            );
    };
}
