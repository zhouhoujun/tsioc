import { ProvdierOf, Type } from '@tsdi/ioc';
import { RequestMethod } from '@tsdi/common';
import { MimeSource, TransportOptions } from '@tsdi/common/transport';
import { RequestHandlerOptions } from './AbstractRequestHandler';
import { SessionOptions } from './Session';
import { ContentOptions } from './interceptors/content';
import { RouteOpts } from './router/router.module';
import { ServerTransportFactory } from './transport';
import { RequestHandler } from './RequestHandler';
import { RestfulRequestContext } from './RestfulRequestContext';
import { ServerOptions as Http1ServerOptions } from 'http';
import { ServerOptions as HttsServerOptions } from 'https';
import { ServerOptions as Http2ServerOptions, SecureServerOptions } from 'http2';
import { MiddlewareOpts } from './middleware/middleware';


export interface ProxyOpts {
    proxyIpHeader: string;
    maxIpsCount?: number;
}

/**
 * server options
 */
export interface ServerOpts<TSerOpts = any> extends RequestHandlerOptions<any> {
    /**
     * request timeout.
     */
    timeout?: number;
    session?: boolean | SessionOptions;
    content?: ContentOptions;
    serverOpts?: TSerOpts;
    /**
     * is microservice or not.
     */
    microservice?: boolean;

    /**
     * server request handler type
     */
    handlerType?: Type<RequestHandler>;

    /**
     * service transport factory.
     */
    transportFactory?: ProvdierOf<ServerTransportFactory>;
    /**
     * transport options.
     */
    transportOptions?: TransportOptions,

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

    protocol?: string;

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

export interface HttpBasiceOpts extends ServerOpts, MiddlewareOpts {
    proxy?: ProxyOpts;
    cors?: boolean | CorsOpts;
    mimeDb?: Record<string, MimeSource>;
    content?: ContentOptions;
    controllers?: string[] | Type[];
    listenOpts?: ListenOpts;
    csrf?: boolean | CsrfOps;
}

/**
 * http options.
 */
export interface Http1ServerOpts extends HttpBasiceOpts {
    majorVersion?: 1,
    protocol?: 'http';
    serverOpts?: Http1ServerOptions;
}

/**
 * https options.
 */
export interface HttpsServerOpts extends HttpBasiceOpts {
    majorVersion?: 1,
    protocol?: 'https';
    serverOpts?: HttsServerOptions;
}

/**
 * http2 options.
 */
export interface Http2ServerOpts extends HttpBasiceOpts {
    majorVersion: 2,
    protocol?: 'http';
    serverOpts?: Http2ServerOptions;
}

/**
 * http2 options.
 */
export interface Http2SecureServerOpts extends HttpBasiceOpts {
    majorVersion: 2,
    protocol?: 'https';
    serverOpts?: SecureServerOptions;
}


export type HttpServerOpts = Http1ServerOpts | HttpsServerOpts | Http2ServerOpts | Http2SecureServerOpts;