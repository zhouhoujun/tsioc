import { Abstract } from '@tsdi/ioc';
import { Router } from './router';
import { RequestContext } from '../RequestContext';
import { RequestHandler } from '../RequestHandler';
import { Middleware, MiddlewareLike } from '../middleware/middleware';

/**
 * Hybird route.
 */
export type HybridRoute = RequestHandler | MiddlewareLike | Array<RequestHandler | MiddlewareLike>;

/**
 * Hybrid router.
 * 
 * public api for global router
 */
@Abstract()
export abstract class HybridRouter extends Router<HybridRoute> implements Middleware {
    /**
     * invoke middleware.
     *
     * @param {RequestContext} ctx context.
     * @param {() => Promise<void>} next
     * @returns {Observable<T>}
     */
    abstract invoke(ctx: RequestContext, next: () => Promise<void>): Promise<void>;

}
