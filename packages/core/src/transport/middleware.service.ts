import { Abstract } from '@tsdi/ioc';
import { EndpointContext } from '../endpoints';
import { EndpointService, MicroServiceEndpoint } from '../EndpointService';
import { MiddlewareProviderOf } from './middleware';


/**
 * middleware serivce.
 */
export interface MiddlewareService {
    /**
     * use middlewares.
     * @param middlewares 
     */
    use(middlewares: MiddlewareProviderOf | MiddlewareProviderOf[], order?: number): this;
}

/**
 * Service endpoint.
 */
@Abstract()
export abstract class ServiceEndpoint<TCtx extends EndpointContext, TOutput> extends MicroServiceEndpoint<TCtx, TOutput> implements EndpointService, MiddlewareService  {
    
    abstract use(middlewares: MiddlewareProviderOf | MiddlewareProviderOf[], order?: number): this;
}
