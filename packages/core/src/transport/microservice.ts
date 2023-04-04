import { Abstract, ProvdierOf, StaticProvider } from '@tsdi/ioc';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { Filter } from '../filters/filter';
import { EndpointContext } from '../endpoints/context';
import { EndpointService } from '../endpoints/endpoint.service';
import { OperationEndpoint } from '../endpoints/endpoint.factory';



@Abstract()
export abstract class MicroService<TCtx extends EndpointContext, TOutput = any> implements EndpointService {
    
    constructor(private endpoint: OperationEndpoint<TCtx, TOutput>) {
        
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