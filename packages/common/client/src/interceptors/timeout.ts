import { AbstractRequest, RequestHandlerFn, RequestInterceptorFn } from '@tsdi/common';
import { catchError, throwError, timeout } from 'rxjs';
import { ClientTransport } from '../transport';



/**
 * request body content interceptor.
 */
export const requestTimeoutInterceptor: RequestInterceptorFn = (input: AbstractRequest<any>, next: RequestHandlerFn, context?: any) => {
    if (input.timeout) {
        return next(input, context)
            .pipe(
                timeout(input.timeout),
                catchError(err => {
                    if (err.name == 'TimeoutError') {
                        const factory = (context?.transport ?? input.context.get(ClientTransport) as ClientTransport)?.responseFactory;
                        return throwError(() => factory ? factory.create({ headers: {}, error: err, ok: false }) : err);
                    }
                    return throwError(() => err);
                })
            )
    }
    return next(input, context)
}

