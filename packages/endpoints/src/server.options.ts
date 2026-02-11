import { Incoming, LoggerOptions, Outgoing, RequestContext, RequestExceptionFilter, RequestFilterLike, RequestInterceptorLike, RequestMethod, TransferConfig, TransferInterceptorFactory, TransferSide, TransportConfig } from '@tsdi/common';
import { ServiceHandlerOptions } from './ServiceHandler';
import { ContentOptions } from './interceptors/content';
import { RouteOpts } from './router/router.providers';
import { RestfulRequestContext } from './RestfulRequestContext';
import { SessionOptions } from './sessions/Session';
import { ProvdierOf, Token, Type } from '@tsdi/ioc';
import { GuardLike, VaildatorLike } from '@tsdi/core';
import { BodyparserOptions, JsonOptions } from './interceptors';
import { MiddlewareLike } from './middleware/middleware';
import { RequestContextFactory } from './AbstractRequestContext';

export interface ProxyOpts {
    proxyIpHeader: string;
    maxIpsCount?: number;
}


export interface FeatureOptions {
    /**
     * request timeout.
     */
    timeout?: number;
    filters?: ProvdierOf<RequestFilterLike>[];
    interceptors?: ProvdierOf<RequestInterceptorLike>[];
    middlewares?: ProvdierOf<MiddlewareLike>[];
    guards?: ProvdierOf<GuardLike>[];
    requestVaildators?: ProvdierOf<VaildatorLike<Incoming, RequestContext>>[];
    responseVaildators?: ProvdierOf<VaildatorLike<Outgoing, RequestContext>>[];
    cors?: boolean | CorsOpts;
    session?: boolean | SessionOptions;
    csrf?: boolean | CsrfOps;
    content?: boolean | ContentOptions;
    logger?: boolean | LoggerOptions;
    json?: boolean | JsonOptions;
    bodyparser?: boolean | BodyparserOptions;
    router?: boolean | RouteOpts;
    transfers?: TransferInterceptorFactory[];

    contextFactory?: Token<RequestContextFactory>;
    exceptionFilter?: ProvdierOf<RequestExceptionFilter>;
    exceptionHandlers?: Type[];

}
/**
 * service config.
 */
export interface ServiceConfig<TSerOpts = any> extends ServiceHandlerOptions<any>, TransferConfig {

    side: TransferSide.server;

    serverOpts?: TSerOpts;

    asDefault?: boolean;
    /**
     * is microservice or not.
     */
    microservice?: boolean;

    server?: any;
    /**
     * send detail error message to client or not. 
     */
    detailError?: boolean;

    listenOpts?: any;

    proxy?: ProxyOpts;

    secure?: boolean;

    bootstrap?: boolean;
    
    payloadKey?: 'body' | 'payload';
}


/**
 * cors options.
 */
export interface CorsOpts {
    /**
     * origin.
     *
     * @memberof CorsOptions
     */
    origin?: string | ((ctx: RestfulRequestContext) => string | Promise<string>);
    /**
     * enable Access-Control-Allow-Credentials
     *
     * @type {boolean}
     * @memberof CorsOptions
     */
    credentials?: boolean;
    /**
     * set request Access-Control-Expose-Headers
     *
     * @type {string}
     * @memberof CorsOptions
     */
    exposeHeaders?: string;
    /**
     * keep headers on error.
     *
     * @type {boolean}
     * @memberof CorsOptions
     */
    keepHeadersOnError?: boolean;
    /**
     * allow cors request methods
     *
     * @type {(string | (string | RequestMethod)[])}
     * @memberof CorsOptions
     */
    allowMethods?: string | (string | RequestMethod)[];
    /**
     * allow cors request headers, 'Access-Control-Request-Headers'
     *
     * @type {(string | string[])}
     * @memberof CorsOptions
     */
    allowHeaders?: string | string[];
    /**
     * set cors cache max age.  Access-Control-Max-Age.
     *
     * @type {number}
     * @memberof CorsOptions
     */
    maxAge?: number | string;
}

export interface ListenOpts {
    port?: number | undefined;
    host?: string | undefined;
    backlog?: number | undefined;
    path?: string | undefined;
    exclusive?: boolean | undefined;
    readableAll?: boolean | undefined;
    writableAll?: boolean | undefined;
    /**
     * @default false
     */
    ipv6Only?: boolean | undefined;

    /**
     * When provided the corresponding `AbortController` can be used to cancel an asynchronous action.
     */
    signal?: AbortSignal | undefined;
    url?: string;
}

export interface CsrfOps {
    invalidTokenMessage?: string | ((ctx: RestfulRequestContext) => string);
    excludedMethods?: string[];
    disableQuery?: boolean;
    /**
     * The string length of the salt (default: 8)
     */
    saltLength?: number;
    /**
     * The byte length of the secret key (default: 18)
     */
    secretLength?: number;
}

