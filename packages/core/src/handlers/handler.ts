import { composeInterceptors, isFunction, isPromise } from '@tsdi/ioc';
import { Observable, isObservable, of, from } from 'rxjs';
import { Backend, Handler, HandlerFn } from '../Handler';
import { InterceptorFn, InterceptorLike } from '../Interceptor';


/**
 * intercepting hnalder.
 */
export class InterceptingHandler<TInput = any, TOutput = any, TContext = any> implements Handler<TInput, TOutput, TContext> {

    private chain?: InterceptorFn<TInput, TOutput, TContext> | null;
    private backend: HandlerFn;

    constructor(
        backend: Backend<TInput, TOutput, TContext> | HandlerFn,
        private interceptors: InterceptorLike[] | (() => InterceptorLike[]) = []
    ) {
        if (isFunction(backend)) {
            this.backend = backend
        } else {
            this.backend = (req, ctx) => (backend as Backend).handle(req, ctx);
        }
    }

    handle(input: TInput, context?: TContext): Observable<TOutput> {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.chain(input, this.backend, context);
    }

    protected reset() {
        this.chain = null;
    }

    protected compose(): InterceptorFn<TInput, TOutput> {
        return composeInterceptors(isFunction(this.interceptors) ? this.interceptors() : this.interceptors)
    }
}


export function toObservable<T>(res: T): Observable<T> {
    if (isObservable(res)) {
        return res as Observable<T>;
    }
    return isPromise(res) ? from(res) : of(res);
}

/**
 * handler factory.
 * @param fn 
 * @returns 
 */
export function handlerFactory<TInput = any, TOutput = any, TContext = any>(fn: (ctx: TInput, context?: TContext) => TOutput | Observable<TOutput> | Promise<TOutput>) {
    const handle = (input: TInput, context?: TContext) => toObservable(fn(input, context));
    return {
        handle
    }
}
