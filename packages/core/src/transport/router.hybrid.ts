import { Abstract } from '@tsdi/ioc';
import { Router } from './router';
import { Endpoint } from '../endpoints/endpoint';
import { Middleware, MiddlewareLike } from './middleware';
import { TransportContext } from './context';

/**
 * Hybird route.
 */
export type HybridRoute = Endpoint | MiddlewareLike | Array<Endpoint | MiddlewareLike>;

/**
 * Hybrid router.
 */
@Abstract()
export abstract class HybridRouter extends Router<HybridRoute> implements Middleware {
    /**
     * invoke middleware.
     *
     * @param {TransportContext} ctx context.
     * @param {() => Promise<void>} next
     * @returns {Observable<T>}
     */
    abstract invoke(ctx: TransportContext, next: () => Promise<void>): Promise<void>;

}
