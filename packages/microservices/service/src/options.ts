import { InstanceOf, ProvdierOf, Provider, Token, token } from '@tsdi/ioc';
import { VaildatorLike } from '@tsdi/core';
import {
    Incoming, Outgoing, PatternFormatter, RequestContext, TransferConfig,
    TransferSide, TransferFilterFactory, RequestInterceptorLike, FindOptions
} from '@tsdi/common';
export * from './features/index';
export * from './middleware';
import { RegistrationOptions } from './features/RegistrationOptions';
import { HealthOptions } from './features/HealthOptions';
import { GracefulShutdownOptions } from './features/GracefulShutdownOptions';
import { ServiceHandlerOptions } from './ServiceHandler';



/**
 * Identifies a particular kind of `ServiceFeature`.
 *
 * The values are ordered from lower-level transport concerns up to
 * higher-level service composition concerns so provider lists can be
 * sorted deterministically before transport providers are appended.
 * @publicApi
 */
export enum ServiceFeatureKind {
    /** Logs exceptions raised while request/transfer chains are executing. */
    ExecptionLogger,
    /** Registers transport-side request/response transfer interceptors. */
    Transfer,
    /** Registers service-side request lifecycle logging. */
    Logger,
    /** Registers request filters that serialize adapter state to transport output. */
    Sender,
    /** Registers exception-oriented request filters. */
    ExceptionFilter,
    /** Registers generic request filters. */
    Filters,
    /** Registers authorization or precondition guards. */
    Guards,
    /** Registers request interceptors around handler execution. */
    Interceptors,
    /** Registers middleware adapters that are converted into interceptors. */
    Middlewares,
    /** Registers route tables and route matching interceptors. */
    Router,
    /** Registers controller declarations and route metadata sources. */
    Controller,
    /** Registers the concrete transport runtime and transport-specific providers. */
    Transport,
    /** Registers service discovery/registration support. */
    Registration,
    /** Registers health-check support. */
    Health,
    /** Registers graceful-shutdown support. */
    GracefulShutdown,
    /** Registers request body parsing support. */
    BodyParser,
    /** Registers response body serialization support. */
    BodySerializer,
    /** Registers static-content/file handling support. */
    Content,
    /** Registers JSON-specific response/request shaping support. */
    Json,
    /** Registers session support. */
    Session,
    /** Registers cookie support. */
    Cookie,
    /** Registers CORS support. */
    Cors
}


export interface ServiceFeature<Kind extends ServiceFeatureKind = ServiceFeatureKind> {
    kind: Kind;
    config?: ServiceConfig;
    providers: Provider[];
}


export interface ServiceTransportFeature {
    kind: ServiceFeatureKind.Transport;
    config: ServiceConfig;
    providers: Provider[];
}


export interface RouteOpts {
    microservice?: boolean;
    formatter?: InstanceOf<PatternFormatter>;
}

/**
 * Microservice feature options.
 * 微服务特性选项
 */
export interface FeatureInterceptorOptions {
    interceptor?: ProvdierOf<RequestInterceptorLike>;
    multiOrder?: number;
}

export interface ContentOptions<TStats = any> extends FindOptions, FeatureInterceptorOptions {
    setHeaders?: (outgoing: Outgoing, path: string, stats: TStats) => void;
    defer?: boolean;
}

export interface BodyparserOptions extends FeatureInterceptorOptions {
    json?: {
        strict?: boolean;
        limit: string;
    };
    form?: {
        limit: string;
        qs?: { parse: Function };
        queryString?: {
            allowDots?: boolean;
        };
    };
    text?: {
        limit: string;
    };
    multipart?: {
        limit: string;
    };
    encoding?: string;
    enableTypes?: string[];
}

export interface JsonOptions extends FeatureInterceptorOptions {
    strict?: boolean;
}

export interface SessionOptions extends FeatureInterceptorOptions {
    key?: string;
    overwrite?: boolean;
    httpOnly?: boolean;
    signed?: boolean;
    autoCommit?: boolean;
    maxAge?: number;
    encode?: (body: any) => string;
    decode?: (str: string) => any;
}

export interface CookieOptions extends FeatureInterceptorOptions {
    keys?: string[];
    secure?: boolean;
    signed?: boolean;
}

export interface CorsOptions extends FeatureInterceptorOptions {
    origin?: string | ((req: any) => string | Promise<string>);
    credentials?: boolean;
    exposeHeaders?: string | string[];
    keepHeadersOnError?: boolean;
    allowMethods?: string | (string | number)[];
    allowHeaders?: string | string[];
    maxAge?: number | string;
}

export interface AuthOptions extends FeatureInterceptorOptions {
    [key: string]: any;
}

/**
 * Service-side logger options.
 * These options are owned by the service layer instead of reusing
 * `@tsdi/common` logger contracts directly.
 */
export interface ServiceLoggerOptions {
    level?: string;
}

/**
 * Service-side exception logger options.
 * Used for transfer/filter-level exception capture without coupling to
 * terminal logger formatting concerns.
 */
export interface ExecptionLoggerOptions {
    level?: string;
}

export const SERVICE_EXECEPTION_LOGGER_OPTIONS = token<ExecptionLoggerOptions>('SERVICE_EXECEPTION_LOGGER_OPTIONS');

/**
 * API rate limit options.
 * API 限流选项
 */
export interface ApiRateLimitOptions {
    /**
     * Maximum number of requests allowed within the window.
     * 窗口期内最大请求数
     */
    limit: number;

    /**
     * Time window in milliseconds.
     * Default: 60000 (1 minute).
     * 限流时间窗口（毫秒），默认 60000（1 分钟）
     */
    windowMs?: number;

    /**
     * Custom key function to identify the client.
     * Uses x-forwarded-for or remote address for HTTP, falls back to 'global'.
     * 自定义限流 key 函数，默认使用 x-forwarded-for 或远程地址
     */
    key?: (input: any, context: RequestContext) => string;

    /**
     * Error message when rate limit is exceeded.
     * 超过限流时的错误消息
     */
    message?: string;
}

export interface ServiceFeatureOptions<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends ServiceHandlerOptions<TReq, TRes, TContext> {
    timeout?: number;
    rateLimit?: boolean | ApiRateLimitOptions;
    requestVaildators?: ProvdierOf<VaildatorLike<Incoming, TContext>>[];
    responseVaildators?: ProvdierOf<VaildatorLike<Outgoing, TContext>>[];
    logger?: boolean | ServiceLoggerOptions;
    execptionLogger?: boolean | ExecptionLoggerOptions;
    transfers?: TransferFilterFactory[];
    bodyparser?: boolean | BodyparserOptions;
    bodySerializer?: boolean;
    content?: boolean | ContentOptions;
    json?: boolean | JsonOptions;
    session?: boolean | SessionOptions;
    cookie?: boolean | CookieOptions;
    cors?: boolean | CorsOptions;
    auth?: boolean | AuthOptions;
    router?: boolean | RouteOpts;
    registration?: boolean | RegistrationOptions;
    health?: boolean | HealthOptions;
    gracefulShutdown?: boolean | GracefulShutdownOptions;
    messageReaderFactory?: any;
    messagerReaderFactory?: any;
    defaultTransfer?: TransferFilterFactory;
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


export interface ServiceOptions<TReq = any, TRes = any, TContext extends RequestContext = RequestContext> extends ServiceConfig<TReq, TRes, TContext> {
    asDefault?: boolean;
    messageReaderFactory?: any;
    transportFeature?: (options: ServiceOptions<TReq, TRes, TContext>, asDefault?: boolean) => ServiceTransportFeature;
}

