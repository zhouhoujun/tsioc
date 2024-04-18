import { Abstract, ProvdierOf, StaticProvider } from '@tsdi/ioc';
import { CanActivate, Interceptor, PipeTransform, Filter, Runner, Shutdown, ApplicationEvent, HandlerService } from '@tsdi/core';
import { HybirdTransport, StatusAdapter, TransportOpts } from '@tsdi/common/transport';
import { EndpointHandler, EndpointOptions } from './EndpointHandler';
import { RequestContext } from './RequestContext';
import { SessionOptions } from './Session';
import { RouteOpts } from './router/router.module';
import { ContentOptions } from './interceptors/content';
import { RequestHandler } from './RequestHandler';
import { TransportSessionFactory } from './transport.session';
import { DefaultOutgoingEncodeHandler } from './codings/outgoing.encodings';
import { DefaultIncomingDecodeHandler } from './codings/incoming.decodings';


export interface ProxyOpts {
    proxyIpHeader: string;
    maxIpsCount?: number;
}

export interface ServerTransportOpts extends TransportOpts {
    defaultOutgoingHanlder?: ProvdierOf<DefaultOutgoingEncodeHandler>;
    defaultIncomingHanlder?: ProvdierOf<DefaultIncomingDecodeHandler>;

}

/**
 * server options
 */
export interface ServerOpts<TSerOpts = any> extends EndpointOptions<any> {
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
     * status adapter
     */
    statusAdapter?: ProvdierOf<StatusAdapter>;
    /**
     * transport session options.
     */
    transportOpts?: ServerTransportOpts;
    /**
     * service transport session factory.
     */
    sessionFactory?: ProvdierOf<TransportSessionFactory>;
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
    start() {
        return this.onStart()
    }

    @Shutdown()
    close() {
        this.handler.onDestroy?.();
        return this.onShutdown();
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
     * service endpoint handler.
     */
    abstract get handler(): EndpointHandler<TRequest, TOptions>;

    getOptions(): TOptions {
        return this.handler.getOptions()
    }

    useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number | undefined): this {
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

    constructor(readonly server: T, readonly transport: HybirdTransport, target: any) {
        super(target)
    }

}