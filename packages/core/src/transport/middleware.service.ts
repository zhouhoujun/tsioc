import { MiddlewareOf } from './middleware';


/**
 * middleware serivce.
 */
export interface MiddlewareService {
    /**
     * use middlewares.
     * @param middlewares 
     */
    use(middlewares: MiddlewareOf | MiddlewareOf[], order?: number): this;
}
