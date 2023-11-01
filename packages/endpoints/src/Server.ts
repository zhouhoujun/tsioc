import { Abstract, ProvdierOf, ProviderType, StaticProvider, Type } from '@tsdi/ioc';
import { CanActivate, Interceptor, PipeTransform, Filter, EndpointService, Runner, Shutdown, ApplicationEvent, TypedRespond } from '@tsdi/core';
import { Decoder, Encoder, TransportOpts, TransportSessionFactory } from '@tsdi/common';
import { TransportEndpoint, TransportEndpointOptions } from './TransportEndpoint';
import { TransportContext } from './TransportContext';
import { SessionOptions } from './Session';
import { Responder } from './Responder';
import { RequestHandler } from './RequestHandler';
import { RouteOpts } from './router/router.module';
import { ContentOptions } from './send';


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
     * typed respond for endpoint.
     */
    typedRespond: ProvdierOf<TypedRespond>;
    /**
     * provider of responder.
     */
    responder: ProvdierOf<Responder>;
    /**
     * request handler for this server.
     */
    requestHanlder: ProvdierOf<RequestHandler>;

    providers?: ProviderType[]
}


export const TRANSPORT_PACKET_STRATEGIES: Record<string, TransportPacketStrategy> = {};


/**
 * server options
 */
export interface ServerOpts<TSerOpts = any> extends TransportEndpointOptions<any> {
    [x: string]: any;
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
    execptionHandlers?: Type<any> | Type[];
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
export abstract class Server<TRequest = any, TResponse = any> implements EndpointService {

    /**
     * micro service endpoint.
     */
    abstract get endpoint(): TransportEndpoint<TransportContext<TRequest, TResponse>, TResponse>;

    useGuards(guards: ProvdierOf<CanActivate<TransportContext<TRequest, TResponse>>> | ProvdierOf<CanActivate<TransportContext<TRequest, TResponse>>>[], order?: number | undefined): this {
        this.endpoint.useGuards(guards, order);
        return this;
    }

    useFilters(filter: ProvdierOf<Filter<TransportContext<TRequest, TResponse>, TResponse>> | ProvdierOf<Filter<TransportContext<TRequest, TResponse>, TResponse>>[], order?: number | undefined): this {
        this.endpoint.useFilters(filter, order);
        return this;
    }

    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this {
        this.endpoint.usePipes(pipes);
        return this;
    }

    useInterceptors(interceptor: ProvdierOf<Interceptor<TransportContext<TRequest, TResponse>, TResponse>> | ProvdierOf<Interceptor<TransportContext<TRequest, TResponse>, TResponse>>[], order?: number | undefined): this {
        this.endpoint.useInterceptors(interceptor, order);
        return this;
    }

    // @Startup()
    // startup() {
    //     return this.onStartup()
    // }

    @Runner()
    start() {
        return this.onStart()
    }

    @Shutdown()
    close() {
        return this.onShutdown()
    }

    // protected abstract onStartup(): Promise<any>;

    protected abstract onStart(): Promise<any>;

    protected abstract onShutdown(): Promise<any>;

}

/**
 *  bind Server event.
 */
export class BindServerEvent<T = any> extends ApplicationEvent {

    constructor(readonly server: T, target: any) {
        super(target)
    }

}