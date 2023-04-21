import { Abstract, ProvdierOf, StaticProvider } from '@tsdi/ioc';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { Filter } from '../filters/filter';
import { EndpointContext } from '../endpoints/context';
import { EndpointService } from '../endpoints/endpoint.service';
import { ConfigableEndpoint } from '../endpoints/endpoint.factory';



@Abstract()
export abstract class MicroService<TInput extends EndpointContext, TOutput = any> implements EndpointService {
    
    /**
     * micro service endpoint.
     */
    abstract get endpoint(): ConfigableEndpoint<TInput, TOutput>;

    useGuards(guards: ProvdierOf<CanActivate<TInput>> | ProvdierOf<CanActivate<TInput>>[], order?: number | undefined): this {
        this.endpoint.useGuards(guards, order);
        return this;
    }

    useFilters(filter: ProvdierOf<Filter<TInput, TOutput>> | ProvdierOf<Filter<TInput, TOutput>>[], order?: number | undefined): this {
        this.endpoint.useFilters(filter, order);
        return this;
    }

    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.endpoint.usePipes(pipes);
        return this;
    }

    useInterceptors(interceptor: ProvdierOf<Interceptor<TInput, TOutput>> | ProvdierOf<Interceptor<TInput, TOutput>>[], order?: number | undefined): this {
        this.endpoint.useInterceptors(interceptor, order);
        return this;
    }
}