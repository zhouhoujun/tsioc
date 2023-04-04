import { Abstract } from '@tsdi/ioc';
import { EndpointContext } from '../endpoints/context';
import { EndpointService } from '../endpoints/endpoint.service';
import { OperationEndpoint } from '../endpoints/endpoint.factory';
import { MiddlewareOf } from './middleware';
import { MiddlewareService } from './middleware.service';

/**
 * Service endpoint.
 */
@Abstract()
export abstract class ServerEndpoint<TCtx extends EndpointContext, TOutput> extends OperationEndpoint<TCtx, TOutput> implements EndpointService, MiddlewareService  {
    
    abstract use(middlewares: MiddlewareOf | MiddlewareOf[], order?: number): this;
}
