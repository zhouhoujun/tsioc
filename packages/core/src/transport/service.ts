import { ProvdierOf, StaticProvider, Abstract } from '@tsdi/ioc';
import { EndpointContext } from '../endpoints/context';
import { EndpointService } from '../EndpointService';
import { Filter } from '../filters';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes';
import { MiddlewareProviderOf } from './middleware';
import { MiddlewareService, MiddlewareEndpoint } from './middleware.service';

@Abstract()
export abstract class Service<TCtx extends EndpointContext, TOutput = any> implements EndpointService, MiddlewareService {


    constructor(private endpoint: MiddlewareEndpoint<TCtx, TOutput>) {
        
    }

    use(middlewares: MiddlewareProviderOf | MiddlewareProviderOf[], order?: number | undefined): this {
        this.endpoint.use(middlewares, order);
        return this;
    }
    useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number | undefined): this {
        this.endpoint.useGuards(guards, order);
        return this;
    }
    useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number | undefined): this {
        this.endpoint.useFilters(filter, order);
        return this;
    }
    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.endpoint.usePipes(pipes);
        return this;
    }
    useInterceptors(interceptor: ProvdierOf<Interceptor> | ProvdierOf<Interceptor>[], order?: number | undefined): this {
        this.endpoint.useInterceptors(interceptor, order);
        return this;
    }

}
