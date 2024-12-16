import { isFunction, isPromise } from '@tsdi/ioc';
import { Observable, isObservable, of, from } from 'rxjs';
import { Backend, Handler, HandlerFn } from '../Handler';
import { InterceptorFn, InterceptorLike } from '../Interceptor';
import { FilterFn, FilterLike } from '../filters/filter';


/**
 * intercepting hnalder.
 */
export class InterceptingHandler<TInput = any, TOutput = any, TContext = any> implements Handler<TInput, TOutput, TContext> {

    private chain?: InterceptorFn<TInput, TOutput, TContext> | null;

    constructor(
        private backend: Backend<TInput, TOutput, TContext> | HandlerFn,
        private interceptors: InterceptorLike[] | (() => InterceptorLike[]) = []
    ) { }

    handle(input: TInput, context?: TContext): Observable<TOutput> {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.chain(input,
            isFunction(this.backend) ? this.backend : (req, ctx) => (this.backend as Backend).handle(req, ctx ?? context),
            context
        );
    }

    protected reset() {
        this.chain = null;
    }

    protected compose(): InterceptorFn<TInput, TOutput> {
        return composeInterceptors(isFunction(this.interceptors) ? this.interceptors() : this.interceptors)
    }
}


/**
 * compose chain filters.
 * @param filters 
 * @returns 
 */
export function composeFilters(filters: FilterLike[]): FilterFn {
    return filters.reduceRight((next, filterFn) => chainedFilterFn(next as FilterFn, filterFn), chainEndFn as FilterFn) as FilterFn;
}

/**
 * Constructs a `ChainedFilterFn` which wraps and invokes a functional interceptor.
 */
function chainedFilterFn(
    chainTailLike: FilterLike, filterLike: FilterLike,
): FilterFn {

    const chainTailFn = isFunction(chainTailLike) ? chainTailLike : (req: any, handle: HandlerFn, context?: any) => chainTailLike.doFilter(req, {
        handle,
    }, context);
    const interceptorFn = isFunction(filterLike) ? filterLike : (req: any, handle: HandlerFn, context?: any) => filterLike.doFilter(req, {
        handle,
    }, context);

    return (initialRequest, finalHandlerFn) =>
        interceptorFn(
            initialRequest,
            downstreamRequest => chainTailFn(downstreamRequest, finalHandlerFn)
        )
}

/**
 * compose chain interceptor.
 * @param interceptors 
 * @returns 
 */
export function composeInterceptors(interceptors: InterceptorLike[]): InterceptorFn {
    return interceptors.reduceRight((next, interceptorFn) => chainedInterceptorFn(next as InterceptorFn, interceptorFn), chainEndFn as InterceptorFn) as InterceptorFn;
}


function chainEndFn<TInput = any, TOutput = any, TContext = any>(req: TInput, finalHandlerFn: HandlerFn, context?: TContext): Observable<TContext> {
    return finalHandlerFn(req, context);
}

/**
 * Constructs a `ChainedInterceptorFn` which wraps and invokes a functional interceptor.
 */
function chainedInterceptorFn(
    chainTailLike: InterceptorLike, interceptorLike: InterceptorLike,
): InterceptorFn {

    const chainTailFn = isFunction(chainTailLike) ? chainTailLike : (req: any, handle: HandlerFn, context?: any) => chainTailLike.intercept(req, {
        handle,
    }, context);
    const interceptorFn = isFunction(interceptorLike) ? interceptorLike : (req: any, handle: HandlerFn, context?: any) => interceptorLike.intercept(req, {
        handle,
    }, context);

    return (initialRequest, finalHandlerFn) =>
        interceptorFn(
            initialRequest,
            downstreamRequest => chainTailFn(downstreamRequest, finalHandlerFn)
        )
}

/**
 * handler factory.
 * @param fn 
 * @returns 
 */
export function handlerFactory<TInput = any, TOutput = any, TContext = any>(fn: (ctx: TInput, context?: TContext) => TOutput | Observable<TOutput> | Promise<TOutput>) {
    const handle = (input: TInput, context?: TContext): Observable<TOutput> => {
        const $res = fn(input, context);
        if (isObservable($res)) {
            return $res;
        }
        return isPromise($res) ? from($res) : of($res);
    };

    return {
        handle
    }
}
