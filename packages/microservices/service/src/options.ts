import { ProvdierOf, Token, Type } from '@tsdi/ioc';
import { GuardLike, VaildatorLike } from '@tsdi/core';
import {
    Incoming, Outgoing, RequestContext, RequestFilterLike,
    RequestInterceptorLike, TransferConfig, TransferSide, TransferInterceptorFactory
} from '@tsdi/common';
import { ServiceConfig } from '@tsdi/endpoints';
import { MiddlewareLike } from '@tsdi/endpoints/middleware';
import { RouteOpts } from '@tsdi/endpoints/router';
import { MicroService } from './MicroService';


/**
 * Service registration options, like Spring Cloud Eureka/Consul.
 * 服务注册选项，类似 Spring Cloud Eureka/Consul
 */
export interface RegistrationOptions {
    /**
     * service name to register.
     * 注册的服务名称
     */
    serviceName?: string;
    /**
     * service instance id.
     * 服务实例ID
     */
    instanceId?: string;
    /**
     * service host.
     * 服务主机地址
     */
    host?: string;
    /**
     * service port.
     * 服务端口
     */
    port?: number;
    /**
     * metadata key-value pairs.
     * 元数据键值对
     */
    metadata?: Record<string, string>;
    /**
     * prefer ip address or not.
     * 是否优先使用IP地址
     */
    preferIpAddress?: boolean;
    /**
     * auto register on start or not. default true.
     * 启动时是否自动注册，默认 true
     */
    autoRegister?: boolean;
    /**
     * deregister on shutdown or not. default true.
     * 关闭时是否注销，默认 true
     */
    deregisterOnShutdown?: boolean;
}

/**
 * Health check options, like Spring Cloud Health Actuator.
 * 健康检查选项，类似 Spring Cloud Health Actuator
 */
export interface HealthOptions {
    /**
     * enable health endpoint or not. default true.
     * 是否启用健康端点，默认 true
     */
    enabled?: boolean;
    /**
     * health check path. default '/health'.
     * 健康检查路径，默认 '/health'
     */
    path?: string;
    /**
     * health check interval in milliseconds.
     * 健康检查间隔（毫秒）
     */
    checkInterval?: number;
    /**
     * custom health indicators.
     * 自定义健康指示器
     */
    indicators?: Type[];
}

/**
 * Graceful shutdown options, like Spring Cloud graceful shutdown.
 * 优雅关闭选项，类似 Spring Cloud 优雅关闭
 */
export interface GracefulShutdownOptions {
    /**
     * enable graceful shutdown or not. default true.
     * 是否启用优雅关闭，默认 true
     */
    enabled?: boolean;
    /**
     * timeout in milliseconds to wait for in-flight requests. default 30000.
     * 等待进行中请求的超时时间（毫秒），默认 30000
     */
    timeout?: number;
    /**
     * wait duration before starting shutdown in milliseconds. default 5000.
     * 开始关闭前的等待时间（毫秒），默认 5000
     */
    waitDuration?: number;
    /**
     * deregister before shutdown or not. default true.
     * 关闭前是否注销，默认 true
     */
    deregisterBeforeShutdown?: boolean;
}

/**
 * Microservice feature options.
 * 微服务特性选项
 */
export interface MicroServiceFeatureOptions {
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
export interface MicroServiceConfig<TSerOpts = any> extends ServiceConfig<TSerOpts> {

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
}
