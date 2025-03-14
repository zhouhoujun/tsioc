import { Execption, isFunction } from '@tsdi/ioc';
import { Backend, BackendFn } from '@tsdi/core';
import { defer, Observable } from 'rxjs';
import { MiddlewareFn, MiddlewareLike } from './middleware';
import { RequestContext } from '../RequestContext';



/**
 * parse to MiddewareFn if not. 
 * @param m type of {@link MiddlewareLike}
 * @returns 
 */
export function middlewareFnify<T extends RequestContext>(m: MiddlewareLike<T>): MiddlewareFn<T> {
    return isFunction(m) ? m : ((ctx, next) => m.invoke(ctx, next));
}


/**
 * compose handlers in chain.
 * @param handlers 
 */
export function chain<T extends RequestContext = RequestContext>(handlers: MiddlewareFn<T>[]): MiddlewareFn<T> {
    return (ctx: T, next: () => Promise<void>) => {
        return runChain(handlers, ctx, next);
    }
}

/**
 * run handles in chain.
 *
 * @export
 * @template T input context type.
 * @template TR returnning type.
 * @param {MiddlewareFn<T>[]} handles to run handles in chain. array of {@link MiddlewareFn}.
 * @param {T} ctx input context.
 * @param {() => Promise<void>} [next] the next step.
 */
export function runChain<T extends RequestContext = RequestContext>(handles: MiddlewareFn<T>[], ctx: T, next?: () => Promise<void>): Promise<void> {
    if (!handles.length) return null!;
    let index = -1;
    function dispatch(i: number): Promise<void> {
        if (i <= index) {
            throw new Execption('next called mutiple times.');
        }
        index = i;
        let handle = handles[i];
        if (i === handles.length) {
            handle = next!
        }
        if (!handle) {
            return next? next(): Promise.resolve();
        }
        const gnext = dispatch.bind(null, i + 1);
        return handle(ctx, gnext)
    }
    return dispatch(0)
}

/**
 * compose middlewares
 * @param middlewares 
 */
export function compose<T extends RequestContext>(middlewares: MiddlewareLike<T>[]): MiddlewareFn<T> {
    const middleFns = middlewares.filter(m => m).map(m => middlewareFnify<T>(m));
    return chain(middleFns)
}

/**
 * empty next.
 */
export const NEXT = () => Promise.resolve();

export function middlewareBackendFactory<Tx extends RequestContext>(middlewares: MiddlewareLike[]): BackendFn<Tx> {

    let fn: MiddlewareFn<Tx>;
    return (reqCtx: Tx) => {
        return defer(async () => {
            if (!fn) {
                fn = compose(middlewares)
            }
            await fn(reqCtx, NEXT);
            return reqCtx.response
        })
    }
}

/**
 * middleware backend.
 */
export class MiddlewareBackend<Tx extends RequestContext> implements Backend<Tx> {

    private _middleware?: MiddlewareFn<Tx>;
    constructor(private middlewares: MiddlewareLike<Tx>[]) { }

    handle(context: Tx): Observable<any> {
        return defer(async () => {
            if (!this._middleware) {
                this._middleware = compose(this.middlewares)
            }
            await this._middleware(context, NEXT);
            return context.response.body
        })
    }

    equals(target: any): boolean {
        return this.middlewares === target?.middlewares;
    }
}

