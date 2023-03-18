import { MiddlewareLike } from './middleware';

/**
 * middleware serivce.
 */
export interface MiddlewareService {
    /**
     * use middleware.
     * @param middlewares 
     */
    use(middlewares: MiddlewareLike[]): this;
}
