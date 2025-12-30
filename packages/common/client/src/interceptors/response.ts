import { RequestInterceptorFn, ResponseFactory } from '@tsdi/common';
import { map } from 'rxjs';

export const responseInterceptor: RequestInterceptorFn = (req, next, context) => {
    return next(req, context)
        .pipe(
            map(r => {
                const factory = context.get(ResponseFactory);
                if (factory) return factory.create(r);
                return r;
            })
        )
}