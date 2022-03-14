import { AsyncHandler, chain, DispatchHandler } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { TransportContext } from './context';

/**
 * transport server endpoint handler.
 */
export interface TransportEndpoint<TRequest, TResponse> {
    /**
     * transport server endpoint.
     * @param req request input.
     */
    handle(req: TRequest): Observable<TResponse>;
}


/**
 * Middlewarable implements {@link DispatchHandler}.
 *
 * @export
 */
export interface Middlewarable<T extends TransportContext = TransportContext> extends DispatchHandler<T, Promise<void>> {
    /**
     * middleware handle.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    handle(ctx: T, next?: () => Promise<void>): Promise<void>;
}


/**
* message type for register in {@link Middlewares}.
*/
export type Middleware<T extends TransportContext = TransportContext> = AsyncHandler<TransportContext> | Middlewarable<T>;

/**
 * middleware chain.
 */
export class Chain<T extends TransportContext = TransportContext> implements Middlewarable<T> {
    constructor(private middlewares: Middleware[]) { }
    handle(ctx: T, next?: () => Promise<void>): Promise<void> {
        return chain(this.middlewares, ctx, next);
    }
}
