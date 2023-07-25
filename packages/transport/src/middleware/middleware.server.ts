import { ProvdierOf, Abstract } from '@tsdi/ioc';
import { EndpointService } from '@tsdi/core';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';
import { MiddlewareEndpoint } from './middleware.endpoint';
import { AssetContext } from '../context';
import { Server } from '../microservice';



/**
 * Server with middleware
 */
@Abstract()
export abstract class MiddlewareServer<TInput extends AssetContext, TOutput = any> extends Server<TInput, TOutput> implements EndpointService, MiddlewareService {

    abstract get endpoint(): MiddlewareEndpoint<TInput, TOutput>;

    use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this {
        this.endpoint.use(middlewares, order);
        return this;
    }

}
