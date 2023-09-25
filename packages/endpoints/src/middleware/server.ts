import { Abstract, ProvdierOf } from '@tsdi/ioc';
import { EndpointService } from '@tsdi/core';
import { AssetContext } from '../AssetContext';
import { Server } from '../Server';
import { MiddlewareEndpoint } from './middleware.endpoint';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';


/**
 * Server with middleware
 */
@Abstract()
export abstract class MiddlewareServer<TInput extends AssetContext = AssetContext, TOutput = any> extends Server<TInput, TOutput> implements EndpointService, MiddlewareService {

    abstract get endpoint(): MiddlewareEndpoint<TInput, TOutput>;

    use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this {
        this.endpoint.use(middlewares, order);
        return this;
    }

}
