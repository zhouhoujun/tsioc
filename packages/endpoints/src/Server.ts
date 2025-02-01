import { Abstract, ProvdierOf, StaticProvider, Type } from '@tsdi/ioc';
import { ApplicationEvent, CanHandle, Filter, HandlerService, Interceptor, PipeTransform, Runner, Shutdown } from '@tsdi/core';
import { CommonProtocols } from '@tsdi/common';
import { TransportOptions } from '@tsdi/common/transport';
import { RequestContext } from './RequestContext';
import { RequestHandlerOptions, AbstractRequestHandler } from './AbstractRequestHandler';
import { SessionOptions } from './Session';
import { ContentOptions } from './interceptors/content';
import { RouteOpts } from './router/router.module';
import { ServerTransportFactory } from './transport';
import { RequestHandler } from './RequestHandler';


export interface ProxyOpts {
    proxyIpHeader: string;
    maxIpsCount?: number;
}

/**
 * server options
 */
export interface ServerOpts<TSerOpts = any> extends RequestHandlerOptions<any> {
    /**
     * request timeout.
     */
    timeout?: number;
    session?: boolean | SessionOptions;
    content?: ContentOptions;
    serverOpts?: TSerOpts;
    /**
     * is microservice or not.
     */
    microservice?: boolean;

    /**
     * server request handler type
     */
    handlerType?: Type<RequestHandler>;

    /**
     * service transport factory.
     */
    transportFactory?: ProvdierOf<ServerTransportFactory>;
    /**
     * transport options.
     */
    transportOptions?: TransportOptions,

    majorVersion?: number;
    server?: any;
    /**
     * send detail error message to client or not. 
     */
    detailError?: boolean;

    listenOpts?: any;
    /**
     * routes config.
     */
    routes?: RouteOpts;

    proxy?: ProxyOpts;

    protocol?: string;

    secure?: boolean;
}



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
export abstract class Server<TRequest extends RequestContext = RequestContext, TOptions extends ServerOpts = ServerOpts> extends MicroService implements HandlerService {

    /**
     * service request handler.
     */
    abstract get handler(): AbstractRequestHandler<TRequest, TOptions>;

    getOptions(): TOptions {
        return this.handler.getOptions()
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