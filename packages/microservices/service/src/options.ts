import { ProvdierOf, Provider, Token } from '@tsdi/ioc';
import { GuardLike, VaildatorLike } from '@tsdi/core';
import {
    Incoming, Outgoing, RequestContext, RequestFilterLike,
    RequestInterceptorLike, TransferConfig, TransferSide, TransferInterceptorFactory
} from '@tsdi/common';
import { ServiceFeatureKind } from './provider';
export * from './features/index';
import { MiddlewareLike } from './middleware';
export * from './middleware';
import { RegistrationOptions } from './features/RegistrationOptions';
import { HealthOptions } from './features/HealthOptions';
import { GracefulShutdownOptions } from './features/GracefulShutdownOptions';

export interface RouteOpts {
    microservice?: boolean;
}

/**
 * Microservice feature options.
 * 微服务特性选项
 */
export interface ServiceFeatureOptions {
    timeout?: number;
    filters?: ProvdierOf<RequestFilterLike>[];
    interceptors?: ProvdierOf<RequestInterceptorLike>[];
    middlewares?: ProvdierOf<MiddlewareLike>[];
    guards?: ProvdierOf<GuardLike>[];
    requestVaildators?: ProvdierOf<VaildatorLike<Incoming, RequestContext>>[];
    responseVaildators?: ProvdierOf<VaildatorLike<Outgoing, RequestContext>>[];
    logger?: boolean;
    bodyparser?: boolean;
    router?: boolean | RouteOpts;
    transfers?: TransferInterceptorFactory[];
    registration?: boolean | RegistrationOptions;
    health?: boolean | HealthOptions;
    gracefulShutdown?: boolean | GracefulShutdownOptions;
}

/**
 * Microservice service config.
 * 微服务服务端配置
 */
export interface ServiceConfig<TSerOpts = any> extends TransferConfig {

    side: TransferSide.server;

    /**
     * is microservice. default true.
     * 是否为微服务，默认 true
     */
    microservice: true;

    /**
     * service registration options.
     * 服务注册选项
     */
    registration?: boolean | RegistrationOptions;

    /**
     * health check options.
     * 健康检查选项
     */
    health?: boolean | HealthOptions;

    /**
     * graceful shutdown options.
     * 优雅关闭选项
     */
    gracefulShutdown?: boolean | GracefulShutdownOptions;

    /**
     * target service name.
     * 目标服务名称
     */
    serviceName?: string;

    // Allow tokens to be added for interceptors, guards, etc.
    guardsToken?: Token<any>;
    filtersToken?: Token<any>;
    interceptorsToken?: Token<any>;
    middlewaresToken?: Token<any>;
    transfersToken?: Token<any>;
    routerToken?: Token<any>;
}

export interface ServiceTransportFeature {
    kind: ServiceFeatureKind.Transport;
    config: ServiceConfig;
    providers: Provider[];
}

export interface ServiceOptions<TSerOpts = any> extends ServiceConfig<TSerOpts> {
    features?: ServiceFeatureOptions;
    asDefault?: boolean;
    transportFeature?: (options: ServiceOptions<TSerOpts>, asDefault?: boolean) => ServiceTransportFeature;
}
