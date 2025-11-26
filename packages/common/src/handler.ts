import { Handler, InterceptingHandler, toObservable } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { RequestContext } from './context';


/**
 * Requset handler
 */
export interface RequestHandler<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends Handler<TInput, TOutput, TContext> {
    /**
     * handle.
     * 
     * 处理句柄
     * @param input handle input.
     * @param context handle with context.
     * @param tail next tail.
     */
    handle(input: TInput, context: TContext): Observable<TOutput>;
}

/**
 * Request handler function.
 */
export type RequestHandlerFn<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> = (input: TInput, context: TContext) => Observable<TOutput>;


/**
 * Request handler like.
 */
export type RequestHandlerLike<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> = RequestHandlerFn<TInput, TOutput, TContext> | RequestHandler<TInput, TOutput, TContext>;

/**
 * Request intercepting handler.
 */
export class RequestInterceptingHandler<TInput = any, TOutput = any, TContext extends RequestContext = RequestContext> extends InterceptingHandler<TInput, TOutput, TContext> implements RequestHandler<TInput, TOutput, TContext> {
    handle(req: TInput, context: TContext): Observable<TOutput> {
        return toObservable(super.handle(req, context));
    }
}


