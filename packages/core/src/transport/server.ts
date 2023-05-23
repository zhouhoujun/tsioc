import { ProvdierOf, Abstract } from '@tsdi/ioc';
import { EndpointService } from '../endpoints/endpoint.service';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';
import { AssetEndpoint } from './endpoint';
import { AssetContext } from './context';
import { MicroService } from './microservice';



/**
 * Server
 */
@Abstract()
export abstract class Server<TInput extends AssetContext, TOutput = any> extends MicroService<TInput, TOutput> implements EndpointService, MiddlewareService {

    abstract get endpoint(): AssetEndpoint<TInput, TOutput>;

    use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this {
        this.endpoint.use(middlewares, order);
        return this;
    }

}
