import { ProvdierOf, Abstract } from '@tsdi/ioc';
import { EndpointService } from '../endpoints/endpoint.service';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';
import { MiddlewareEndpoint } from './endpoint';
import { AssetContext } from './context';
import { MicroService } from './microservice';



/**
 * Server
 */
@Abstract()
export abstract class Server<TInput extends AssetContext, TOutput = any> extends MicroService<TInput, TOutput> implements EndpointService, MiddlewareService {

    abstract get endpoint(): MiddlewareEndpoint<TInput, TOutput>;

    use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this {
        this.endpoint.use(middlewares, order);
        return this;
    }

}
