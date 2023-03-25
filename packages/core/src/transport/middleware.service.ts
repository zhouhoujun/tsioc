import { ProvdierOf } from '@tsdi/ioc';
import { MiddlewareLike } from './middleware';

/**
 * middleware serivce.
 */
export interface MiddlewareService {
    /**
     * use middleware.
     * @param middlewares 
     */
    use(middlewares: ProvdierOf<MiddlewareLike> | ProvdierOf<MiddlewareLike>[], order?: number): this;
}
