import { InstanceOf, ProvdierOf, Provider, Token } from '@tsdi/ioc';
import { GuardLike, MessageReaderFactory, VaildatorLike } from '@tsdi/core';
import {
    Incoming, Outgoing, PatternFormatter, RequestContext, RequestFilterLike,
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
    formatter?: InstanceOf<PatternFormatter>;
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
    bodySerializer?: boolean;
    content?: boolean;
    json?: boolean;
    session?: boolean;
    router?: boolean | RouteOpts;
    registration?: boolean | RegistrationOptions;
    health?: boolean | HealthOptions;
    gracefulShutdown?: boolean | GracefulShutdownOptions;    
    messagerReaderFactory?: ProvdierOf<MessageReaderFactory>;
    defaultTransfer?: TransferInterceptorFactory;
}

/**
 * Microservice service config.
 * 微服务服务端配置
 */
export interface ServiceConfig<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends TransferConfig {

    side: TransferSide.server;
    
    features: ServiceFeatureOptions<TReq, TRes, TContext>;

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

export interface ServiceOptions<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends ServiceConfig<TReq, TRes, TContext> {
    asDefault?: boolean;
    transportFeature?: (options: ServiceOptions<TReq, TRes, TContext>, asDefault?: boolean) => ServiceTransportFeature;
}
