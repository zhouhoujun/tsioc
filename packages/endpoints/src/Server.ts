import { Abstract, ProvdierOf, StaticProvider } from '@tsdi/ioc';
import { CanActivate, Interceptor, PipeTransform, Filter, EndpointService, Runner, Shutdown, Startup } from '@tsdi/core';
import { TransportEndpoint } from './TransportEndpoint';
import { TransportContext } from './TransportContext';

/**
 * Micro Service
 * 
 * 微服务
 */
@Abstract()
export abstract class Server<TInput extends TransportContext = TransportContext, TOutput = any> implements EndpointService {
    /**
     * micro service endpoint.
     */
    abstract get endpoint(): TransportEndpoint<TInput, TOutput>;

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
