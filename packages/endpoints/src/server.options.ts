import { ProvdierOf, AbstractType } from '@tsdi/ioc';
import { RequestMethod } from '@tsdi/common';
import { MimeSource, TransportConfigure } from '@tsdi/common/transport';
import { RequestHandlerOptions } from './AbstractRequestHandler';
import { ContentOptions } from './interceptors/content';
import { RouteOpts } from './router/router.providers';
import { ServerTransportFactory } from './transport';
import { RequestHandler } from './RequestHandler';
import { RestfulRequestContext } from './RestfulRequestContext';
import { ServerOptions as Http1ServerOptions } from 'http';
import { ServerOptions as HttsServerOptions } from 'https';
import { ServerOptions as Http2ServerOptions, SecureServerOptions } from 'http2';
import { SessionOptions } from './sessions/Session';

export interface ProxyOpts {
    proxyIpHeader: string;
    maxIpsCount?: number;
}


/**
 * service config.
 */
export interface ServiceConfig<TSerOpts = any> extends RequestHandlerOptions<any>, TransportConfigure {
    /**
     * request timeout.
     */
    timeout?: number;
    session?: SessionOptions;
    content?: ContentOptions;
    serverOpts?: TSerOpts;
    /**
     * is microservice or not.
     */
    microservice?: boolean;
    /**
     * transport protocol
     */
    protocol?: string;

    /**
     * server request handler type
     */
    handlerType?: AbstractType<RequestHandler>;

    /**
     * service transport factory.
     */
    transportFactory?: ProvdierOf<ServerTransportFactory>;

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

    secure?: boolean;
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

export interface HttpBasicServConfig<TSerOpts> extends ServiceConfig<TSerOpts> {
    proxy?: ProxyOpts;
    cors?: boolean | CorsOpts;
    mimeDb?: Record<string, MimeSource>;
    content?: ContentOptions;
    controllers?: string[] | AbstractType[];
    listenOpts?: ListenOpts;
    csrf?: boolean | CsrfOps;
}

/**
 * http options.
 */
export interface Http1ServConfig extends HttpBasicServConfig<Http1ServerOptions> {
    majorVersion?: 1,
    protocol?: 'http';
}

/**
 * https options.
 */
export interface HttpsServConfig extends HttpBasicServConfig<HttsServerOptions> {
    majorVersion?: 1,
    protocol?: 'https';
}

/**
 * http2 options.
 */
export interface Http2ServConfig extends HttpBasicServConfig<Http2ServerOptions> {
    majorVersion: 2,
    protocol?: 'http';
}

/**
 * http2 options.
 */
export interface Http2SecureServConfig extends HttpBasicServConfig<SecureServerOptions> {
    majorVersion: 2,
    protocol?: 'https';
}


export type HttpServConfig = Http1ServConfig | HttpsServConfig | Http2ServConfig | Http2SecureServConfig;
