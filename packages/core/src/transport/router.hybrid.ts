import { Abstract } from '@tsdi/ioc';
import { Router } from './router';
import { Endpoint } from '../endpoints/endpoint';
import { Route } from './route';
import { Middleware, MiddlewareLike } from './middleware';
import { TransportContext } from './context';


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
    /**
     * use route.
     * @param route 
     */
    abstract use(route: Route): this;

    /**
     * use route.
     * @param route
     * @param endpoint endpoint. 
     */
    abstract use(route: string, endpoint: Endpoint): this;
    /**
     * use route.
     * @param route 
     * @param middleware middleware. 
     */
    abstract use(route: string, middleware: MiddlewareLike): this;
}

