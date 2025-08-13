import { composeInterceptors, isFunction, isPromise } from '@tsdi/ioc';
import { Observable, isObservable, of, from } from 'rxjs';
import { Backend, ApplicationHandler, ApplicationHandlerFn } from '../ApplicationHandler';
import { ApplicationInterceptorFn, ApplicationInterceptorLike } from '../ApplicationInterceptor';


/**
 * intercepting hnalder.
 */
export class InterceptingHandler<TInput = any, TOutput = any, TContext = any> implements ApplicationHandler<TInput, TOutput, TContext> {

    private chain?: ApplicationInterceptorFn<TInput, TOutput, TContext> | null;
    private backend: ApplicationHandlerFn;

    constructor(
        backend: Backend<TInput, TOutput, TContext> | ApplicationHandlerFn,
        private interceptors: ApplicationInterceptorLike[] | (() => ApplicationInterceptorLike[]) = []
    ) {
        if (isFunction(backend)) {
            this.backend = backend
        } else {
            this.backend = (req, ctx) => (backend as Backend).handle(req, ctx);
        }
    }

    handle(input: TInput, context: TContext): Observable<TOutput> {
        if (!this.chain) {
            this.chain = this.compose();
        }
        return this.chain(input, this.backend, context);
    }

    protected reset() {
        this.chain = null;
    }

    protected compose(): ApplicationInterceptorFn<TInput, TOutput> {
        return composeInterceptors(isFunction(this.interceptors) ? this.interceptors() : this.interceptors)
    }
}

/**
 * parse response to `Observable`
 */
export function toObservable<T>(res: T): Observable<T> {
    if (isObservable(res)) {
        return res as Observable<T>;
    }
    return isPromise(res) ? from(res) : of(res);
}
