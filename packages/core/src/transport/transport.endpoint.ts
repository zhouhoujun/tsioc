import { Abstract } from '@tsdi/ioc';
import { EndpointContext } from '../endpoints/context';
import { EndpointService } from '../endpoints/endpoint.service';
import { OperationEndpoint } from '../endpoints/endpoint.factory';
import { MiddlewareOf } from './middleware';
import { MiddlewareService } from './middleware.service';

/**
 * Transport endpoint.
 */
@Abstract()
export abstract class TransportEndpoint<TCtx extends EndpointContext, TOutput> extends OperationEndpoint<TCtx, TOutput> implements EndpointService, MiddlewareService  {
    
    abstract use(middlewares: MiddlewareOf | MiddlewareOf[], order?: number): this;
}
