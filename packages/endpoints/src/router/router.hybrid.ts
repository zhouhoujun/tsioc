import { Abstract } from '@tsdi/ioc';
import { ProtocolType } from '@tsdi/common';
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
export abstract class HybridRouter extends Router<HybridRoute> implements Middleware<RequestContext> {
    /**
     * protocol
     */
    abstract get protocol(): ProtocolType | null;
    /**
     * invoke middleware.
     *
     * @param {T} ctx context.
     * @param {() => Promise<void>} next
     * @returns {Observable<T>}
     */
    abstract invoke(ctx: RequestContext, next: () => Promise<void>): Promise<void>;

}
