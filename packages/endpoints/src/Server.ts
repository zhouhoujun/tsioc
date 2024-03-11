import { Abstract, ClassType, ProvdierOf, ProviderType, StaticProvider } from '@tsdi/ioc';
import { CanActivate, Interceptor, PipeTransform, Filter, Runner, Shutdown, ApplicationEvent, HandlerService } from '@tsdi/core';
import { Decoder, Encoder, HybirdTransport, TransportOpts, TransportSessionFactory } from '@tsdi/common/transport';
import { TransportEndpoint, TransportEndpointOptions } from './TransportEndpoint';
import { RequestContext } from './RequestContext';
import { SessionOptions } from './Session';
import { RouteOpts } from './router/router.module';
import { ContentOptions } from './ContentSendAdapter';


export interface ProxyOpts {
    proxyIpHeader: string;
    maxIpsCount?: number;
}

/**
 * transport packet strategy.
 */
export interface TransportPacketStrategy {
    /**
    * encoder
    */
    encoder: ProvdierOf<Encoder>;
    /**
     * decoder
     */
    decoder: ProvdierOf<Decoder>;
    /**
     * providers
     */
    providers?: ProviderType[]
}


export const TRANSPORT_PACKET_STRATEGIES: Record<string, TransportPacketStrategy> = {};


/**
 * server options
 */
export interface ServerOpts<TSerOpts = any> extends TransportEndpointOptions<any> {
    /**
     * socket timeout.
     */
    timeout?: number;
    session?: boolean | SessionOptions;
    content?: ContentOptions;
    serverOpts?: TSerOpts;
    /**
     * transport session options.
     */
    transportOpts?: TransportOpts;
    majorVersion?: number;
    server?: any;
    /**
     * transport packet strategy.
     */
    strategy?: 'json' | 'asset' | TransportPacketStrategy;
    /**
     * execption handlers
     */
    execptionHandlers?: ClassType<any> | ClassType[];
    /**
     * micro service transport session factory.
     */
    sessionFactory?: ProvdierOf<TransportSessionFactory>;
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
 * abstract server.
 * 
 * 微服务
 */
@Abstract()
export abstract class Server<TRequest = any, TResponse = any> implements HandlerService {

    /**
     * micro service endpoint.
     */
    abstract get endpoint(): TransportEndpoint<RequestContext<TRequest, TResponse>, TResponse>;

    useGuards(guards: ProvdierOf<CanActivate<RequestContext<TRequest, TResponse>>> | ProvdierOf<CanActivate<RequestContext<TRequest, TResponse>>>[], order?: number | undefined): this {
        this.endpoint.useGuards(guards, order);
        return this;
    }

    useFilters(filter: ProvdierOf<Filter<RequestContext<TRequest, TResponse>, TResponse>> | ProvdierOf<Filter<RequestContext<TRequest, TResponse>, TResponse>>[], order?: number | undefined): this {
        this.endpoint.useFilters(filter, order);
        return this;
    }

    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.endpoint.usePipes(pipes);
        return this;
    }

    useInterceptors(interceptor: ProvdierOf<Interceptor<RequestContext<TRequest, TResponse>, TResponse>> | ProvdierOf<Interceptor<RequestContext<TRequest, TResponse>, TResponse>>[], order?: number | undefined): this {
        this.endpoint.useInterceptors(interceptor, order);
        return this;
    }

    @Runner()
    start() {
        return this.onStart()
    }

    @Shutdown()
    close() {
        this.endpoint.onDestroy();
        return this.onShutdown();
    }

    protected abstract onStart(): Promise<any>;

    protected abstract onShutdown(): Promise<any>;

}

/**
 *  bind Server event.
 */
export class BindServerEvent<T = any> extends ApplicationEvent {

    constructor(readonly server: T, readonly transport: HybirdTransport, target: any) {
        super(target)
    }

}