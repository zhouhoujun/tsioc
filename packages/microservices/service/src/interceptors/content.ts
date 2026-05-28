import { RequestContext, RequestHandler, RequestInterceptor } from '@tsdi/common';
import { Observable } from 'rxjs';

export abstract class ContentInterceptor<
    TInput = any,
    TOutput = any,
    TContext extends RequestContext = RequestContext
> implements RequestInterceptor<TInput, TOutput, TContext> {
    abstract intercept(input: TInput, next: RequestHandler<TInput, TOutput, TContext>, context: TContext): Observable<TOutput>;
}
