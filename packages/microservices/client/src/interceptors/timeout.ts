import { RequestContext, RequestHandlerFn, RequestInterceptorFn, ResponseFactory } from '@tsdi/common';
import { catchError, throwError, timeout } from 'rxjs';

/**
 * Request timeout interceptor.
 * 请求超时拦截器
 *
 * When `milliseconds` is provided, it serves as the default timeout.
 * Individual requests can override via `input.timeout`.
 * When neither is set, no timeout is applied.
 *
 * @param milliseconds default timeout in milliseconds (optional).
 */
export function requestTimeoutInterceptor(milliseconds?: number): RequestInterceptorFn {
    return (input: any, next: RequestHandlerFn, context: RequestContext) => {
        const timeoutMs = input?.timeout ?? milliseconds;
        if (timeoutMs == null || timeoutMs === Infinity) {
            return next(input, context);
        }
        return next(input, context)
            .pipe(
                timeout(timeoutMs),
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
