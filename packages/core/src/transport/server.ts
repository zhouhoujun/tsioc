import { ProvdierOf, StaticProvider, Abstract } from '@tsdi/ioc';
import { Filter } from '../filters/filter';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { EndpointService } from '../endpoints/endpoint.service';
import { MiddlewareLike } from './middleware';
import { MiddlewareService } from './middleware.service';
import { TransportEndpoint } from './endpoint';
import { TransportContext } from './context';
import { Runner, Shutdown, Startup } from '../metadata';



/**
 * Server
 */
@Abstract()
export abstract class Server<TInput extends TransportContext, TOutput = any> implements EndpointService, MiddlewareService {

    abstract get endpoint(): TransportEndpoint<TInput, TOutput>;

    use(middlewares: ProvdierOf<MiddlewareLike<TInput>> | ProvdierOf<MiddlewareLike<TInput>>[], order?: number): this {
        this.endpoint.use(middlewares, order);
        return this;
    }

    useGuards(guards: ProvdierOf<CanActivate<TInput>> | ProvdierOf<CanActivate<TInput>>[], order?: number): this {
        this.endpoint.useGuards(guards, order);
        return this;
    }

    useFilters(filter: ProvdierOf<Filter<TInput, TOutput>> | ProvdierOf<Filter<TInput, TOutput>>[], order?: number): this {
        this.endpoint.useFilters(filter, order);
        return this;
    }

    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.endpoint.usePipes(pipes);
        return this;
    }

    useInterceptors(interceptor: ProvdierOf<Interceptor<TInput, TOutput>> | ProvdierOf<Interceptor<TInput, TOutput>>[], order?: number): this {
        this.endpoint.useInterceptors(interceptor, order);
        return this;
    }

    @Startup()
    startup() {
        return this.onStartup()
    }

    @Runner()
    start() {
        return this.onStart()
    }

    @Shutdown()
    close() {
        return this.onShutdown()
    }

    protected abstract onStartup(): Promise<any>;

    protected abstract onStart(): Promise<any>;

    protected abstract onShutdown(): Promise<any>;

}
