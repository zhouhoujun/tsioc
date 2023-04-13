import { ProvdierOf, StaticProvider, Abstract } from '@tsdi/ioc';
import { Filter } from '../filters/filter';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { EndpointService } from '../endpoints/endpoint.service';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';
import { TransportEndpoint } from './transport.endpoint';
import { TransportContext } from './context';



/**
 * Server
 */
@Abstract()
export abstract class Server<TCtx extends TransportContext, TOutput = any> implements EndpointService, MiddlewareService {

    abstract get endpoint(): TransportEndpoint<TCtx, TOutput>;

    use(middlewares: ProvdierOf<MiddlewareLike> | ProvdierOf<MiddlewareLike>[], order?: number): this {
        this.endpoint.use(middlewares, order);
        return this;
    }

    useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this {
        this.endpoint.useGuards(guards, order);
        return this;
    }

    useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this {
        this.endpoint.useFilters(filter, order);
        return this;
    }

    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.endpoint.usePipes(pipes);
        return this;
    }

    useInterceptors(interceptor: ProvdierOf<Interceptor> | ProvdierOf<Interceptor>[], order?: number): this {
        this.endpoint.useInterceptors(interceptor, order);
        return this;
    }

}
