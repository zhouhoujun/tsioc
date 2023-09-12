import { ProvdierOf } from '@tsdi/ioc';
import { MiddlewareLike } from './middleware';


/**
 * middleware serivce.
 * 
 * 中间件服务
 */
export interface MiddlewareService {
    /**
     * use middlewares.
     * @param middlewares 
     */
    use(middlewares: ProvdierOf<MiddlewareLike> | ProvdierOf<MiddlewareLike>[], order?: number): this;
}
