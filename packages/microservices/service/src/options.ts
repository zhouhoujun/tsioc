import { ProvdierOf, Provider, Token } from '@tsdi/ioc';
import { GuardLike, VaildatorLike } from '@tsdi/core';
import {
    Incoming, Outgoing, RequestContext, RequestFilterLike,
    RequestInterceptorLike, TransferConfig, TransferSide, TransferInterceptorFactory
} from '@tsdi/common';
import { ServiceFeatureKind } from './provider';
export * from './features/index';
export * from './middleware';
import { RegistrationOptions } from './features/RegistrationOptions';
import { HealthOptions } from './features/HealthOptions';
import { GracefulShutdownOptions } from './features/GracefulShutdownOptions';
import { ServiceHandlerOptions } from './ServiceHandler';

export interface RouteOpts {
    microservice?: boolean;
}

/**
 * Microservice feature options.
 * 微服务特性选项
 */
export interface ServiceFeatureOptions<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends ServiceHandlerOptions<TReq, TRes, TContext> {
    timeout?: number;
    requestVaildators?: ProvdierOf<VaildatorLike<Incoming, TContext>>[];
    responseVaildators?: ProvdierOf<VaildatorLike<Outgoing, TContext>>[];
    logger?: boolean;
    bodyparser?: boolean;
    router?: boolean | RouteOpts;
    registration?: boolean | RegistrationOptions;
    health?: boolean | HealthOptions;
    gracefulShutdown?: boolean | GracefulShutdownOptions;
    defaultTransfer?: TransferInterceptorFactory;
}

/**
 * Microservice service config.
 * 微服务服务端配置
 */
export interface ServiceConfig<TSerOpts = any> extends TransferConfig {

    side: TransferSide.server;
    
    features: ServiceFeatureOptions;

    /**
     * is microservice. default true.
     * 是否为微服务，默认 true
     */
    microservice?: true;

    /**
     * bootstrap service. default true.
     * 是否启动服务，默认 true
     */
    bootstrap?: boolean;

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
}

export interface ServiceTransportFeature {
    kind: ServiceFeatureKind.Transport;
    config: ServiceConfig;
    providers: Provider[];
}

export interface ServiceOptions<TSerOpts = any> extends ServiceConfig<TSerOpts> {
    asDefault?: boolean;
    transportFeature?: (options: ServiceOptions<TSerOpts>, asDefault?: boolean) => ServiceTransportFeature;
}
