import { Abstract, ProvdierOf } from '@tsdi/ioc';
import { EndpointContext } from '../endpoints/context';
import { EndpointService } from '../endpoints/endpoint.service';
import { OperationEndpoint } from '../endpoints/endpoint.factory';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';

/**
 * Transport endpoint.
 */
@Abstract()
export abstract class TransportEndpoint<TCtx extends EndpointContext, TOutput> extends OperationEndpoint<TCtx, TOutput> implements EndpointService, MiddlewareService {

    abstract use(middlewares: ProvdierOf<MiddlewareLike> | ProvdierOf<MiddlewareLike>[], order?: number): this;
}
