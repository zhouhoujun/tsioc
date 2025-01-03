import { chain, isFunction } from '@tsdi/ioc';
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
            return reqCtx.response.body
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

