import { chain, isFunction } from '@tsdi/ioc';
import { defer, Observable } from 'rxjs';
import { MiddlewareFn, MiddlewareLike } from './middleware';
import { EndpointContext } from '../endpoints/context';
import { Backend } from '../Handler';



/**
 * parse to MiddewareFn if not. 
 * @param m type of {@link MiddlewareLike}
 * @returns 
 */
export function middlewareFnify<T extends EndpointContext>(m: MiddlewareLike<T>): MiddlewareFn<T> {
    return isFunction(m) ? m : ((ctx, next) => m.invoke(ctx, next));
}


/**
 * compose middlewares
 * @param middlewares 
 */
export function compose<T extends EndpointContext>(middlewares: MiddlewareLike<T>[]): MiddlewareFn<T> {
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
export class MiddlewareBackend<Tx extends EndpointContext, TResponse> implements Backend<Tx, TResponse> {

    private _middleware?: MiddlewareFn<Tx>;
    constructor(private middlewares: MiddlewareLike<Tx>[]) { }

    handle(context: Tx): Observable<TResponse> {
        return defer(async () => {
            if (!this._middleware) {
                this._middleware = compose(this.middlewares)
            }
            await this._middleware(context, NEXT);
            return context.payload.response;
        })
    }

    equals(target: any): boolean {
        return this.middlewares === target?.middlewares;
    }
}

