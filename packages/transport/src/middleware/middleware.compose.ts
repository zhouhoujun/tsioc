import { chain, isFunction } from '@tsdi/ioc';
import { Backend } from '@tsdi/core';
import { defer, Observable } from 'rxjs';
import { MiddlewareFn, MiddlewareLike } from './middleware';
import { AssetContext } from '../context';



/**
 * parse to MiddewareFn if not. 
 * @param m type of {@link MiddlewareLike}
 * @returns 
 */
export function middlewareFnify<T extends AssetContext>(m: MiddlewareLike<T>): MiddlewareFn<T> {
    return isFunction(m) ? m : ((ctx, next) => m.invoke(ctx, next));
}


/**
 * compose middlewares
 * @param middlewares 
 */
export function compose<T extends AssetContext>(middlewares: MiddlewareLike<T>[]): MiddlewareFn<T> {
    const middleFns = middlewares.filter(m => m).map(m => middlewareFnify<T>(m));
    return chain(middleFns)
}

/**
 * empty next.
 */
export const NEXT = () => Promise.resolve();


/**
 * middleware backend.
 */
export class MiddlewareBackend<Tx extends AssetContext, TResponse> implements Backend<Tx, TResponse> {

    private _middleware?: MiddlewareFn<Tx>;
    constructor(private middlewares: MiddlewareLike<Tx>[]) { }

    handle(context: Tx): Observable<TResponse> {
        return defer(async () => {
            if (!this._middleware) {
                this._middleware = compose(this.middlewares)
            }
            await this._middleware(context, NEXT);
            return context.response
        })
    }

    equals(target: any): boolean {
        return this.middlewares === target?.middlewares;
    }
}

