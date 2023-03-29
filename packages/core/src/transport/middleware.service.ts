import { Abstract } from '@tsdi/ioc';
import { EndpointContext } from '../endpoints/context';
import { EndpointService, MicroServiceEndpoint } from '../EndpointService';
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

/**
 * Service endpoint.
 */
@Abstract()
export abstract class ServiceEndpoint<TCtx extends EndpointContext, TOutput> extends MicroServiceEndpoint<TCtx, TOutput> implements EndpointService, MiddlewareService  {
    
    abstract use(middlewares: MiddlewareOf | MiddlewareOf[], order?: number): this;
}
