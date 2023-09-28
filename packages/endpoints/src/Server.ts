import { Abstract, ProvdierOf, StaticProvider, TypeOf } from '@tsdi/ioc';
import { CanActivate, Interceptor, PipeTransform, Filter, EndpointService, Runner, Shutdown, Startup } from '@tsdi/core';
import { PatternFormatter, TransportOpts, TransportSessionFactory } from '@tsdi/common';
import { TransportEndpoint, TransportEndpointOptions } from './TransportEndpoint';
import { TransportContext } from './TransportContext';
import { SessionOptions } from './Session';
import { Responder } from './Responder';
import { RouteMatcher } from './router/router';
import { Routes } from './router/route';
import { RequestHandler } from './RequestHandler';


/**
 * server options
 */
export interface ServerOpts<TSerOpts = any> extends TransportEndpointOptions<any> {
    /**
     * socket timeout.
     */
    timeout?: number;
    session?: boolean | SessionOptions;
    serverOpts?: TSerOpts;
    /**
     * transport session options.
     */
    transportOpts?: TransportOpts;
    server?: any;
    responder?: ProvdierOf<Responder>;
    /**
     * micro service transport session factory.
     */
    sessionFactory?: ProvdierOf<TransportSessionFactory>;
    /**
     * request handler for this server.
     */
    requestHanlder?: ProvdierOf<RequestHandler>;
    /**
     * default method.
     */
    defaultMethod?: string;
    /**
     * send detail error message to client or not. 
     */
    detailError?: boolean;
    listenOpts?: any;
    /**
     * routes config.
     */
    routes?: {
        matcher?: TypeOf<RouteMatcher>;
        formatter?: TypeOf<PatternFormatter>;
        prefix?: string;
        routes?: Routes;
    }
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
