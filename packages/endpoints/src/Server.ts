import { Abstract, ProvdierOf, StaticProvider } from '@tsdi/ioc';
import { ApplicationEvent, CanHandle, Filter, HandlerService, Interceptor, PipeTransform, Runner, Shutdown } from '@tsdi/core';
import { CommonProtocols } from '@tsdi/common';
import { RequestContext } from './RequestContext';
import { AbstractRequestHandler } from './AbstractRequestHandler';
import { RequestHandler } from './RequestHandler';
import { ServiceConfig } from './server.options';
import { MiddlewareLike } from './middleware/middleware';
import { MiddlewareService } from './middleware/middleware.service';


/**
 * microservice.
 */
@Abstract()
export abstract class MicroService<TRequest extends RequestContext = RequestContext> {

    /**
     * micro service handler
     */
    abstract get handler(): RequestHandler<TRequest>;

    @Runner()
    async start() {
        if (this.handler.ready) await this.handler.ready;
        return await this.onStart()
    }

    @Shutdown()
    async close() {
        await this.onShutdown();
        this.handler.onDestroy?.();
    }

    protected abstract onStart(): Promise<any>;

    protected abstract onShutdown(): Promise<any>;

}


/**
 * abstract server.
 * 
 * 微服务
 */
@Abstract()
export abstract class Server<TRequest extends RequestContext = RequestContext, TOptions extends ServiceConfig = ServiceConfig> extends MicroService implements HandlerService, MiddlewareService {

    /**
     * service request handler.
     */
    abstract get handler(): AbstractRequestHandler<TRequest, TOptions>;

    getOptions(): TOptions {
        return this.handler.getOptions()
    }


    use(middlewares: ProvdierOf<MiddlewareLike> | ProvdierOf<MiddlewareLike>[], order?: number | undefined): this {
        this.handler.use(middlewares, order);
        return this;
    }


    useGuards(guards: ProvdierOf<CanHandle> | ProvdierOf<CanHandle>[], order?: number | undefined): this {
        this.handler.useGuards(guards, order);
        return this;
    }


    useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number | undefined): this {
        this.handler.useFilters(filter, order);
        return this;
    }

    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.handler.usePipes(pipes);
        return this;
    }

    useInterceptors(interceptor: ProvdierOf<Interceptor> | ProvdierOf<Interceptor>[], order?: number | undefined): this {
        this.handler.useInterceptors(interceptor, order);
        return this;
    }

}

/**
 *  bind Server event.
 */
export class BindServerEvent<T = any> extends ApplicationEvent {

    constructor(readonly server: T, readonly transport: CommonProtocols, target: any) {
        super(target)
    }

}