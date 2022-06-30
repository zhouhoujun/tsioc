import { ExecptionFilter, Interceptor, ServerOptions, TransportServer } from '@tsdi/core';
import { tokenId, Type } from '@tsdi/ioc';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { CorsOptions } from '../../middlewares/cors';
import { MimeSource } from '../../mime';
import { HttpServRequest, HttpServResponse } from './context';
import { ListenOptions } from 'net';
import { ContentOptions } from '../../middlewares/content';
import { SessionOptions } from '../../middlewares/session';
import { CsrfOptions } from '../../middlewares/csrf';

/**
 * http options.
 */
 export interface HttpOptions extends ServerOptions<HttpServRequest, HttpServResponse> {
    majorVersion?: number;
    cors?: boolean | CorsOptions;
    proxy?: boolean;
    proxyIpHeader?: string;
    maxIpsCount?: number;
    /**
     * request timeout.
     */
    timeout?: number;
    /**
     * delay some time to clean up after request client close.
     */
    closeDelay?: number;
    detailError?: boolean;
    mimeDb?: Record<string, MimeSource>;
    listenOptions?: ListenOptions;
    content?: boolean | ContentOptions;
    session?: boolean | SessionOptions;
    csrf?: boolean | CsrfOptions;
    /**
     * share with thie http server.
     * eg. ws, socket.io server.
     */
    sharing?: Type<TransportServer<any, any>>[];
}

export interface Http1ServerOptions extends HttpOptions {
    majorVersion: 1,
    options?: http.ServerOptions | https.ServerOptions;
}
export interface Http2ServerOptions extends HttpOptions {
    majorVersion: 2,
    options?: http2.ServerOptions | http2.SecureServerOptions;
}

/**
 * http server options.
 */
export type HttpServerOptions = Http1ServerOptions | Http2ServerOptions;


/**
 * http server opptions.
 */
export const HTTP_SERVEROPTIONS = tokenId<HttpServerOptions>('HTTP_SERVEROPTIONS');


export const HTTP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTION_FILTERS');

/**
 * http server Interceptor tokens for {@link HttpServer}.
 */
export const HTTP_SERV_INTERCEPTORS = tokenId<Interceptor<HttpServRequest, HttpServResponse>[]>('HTTP_SERV_INTERCEPTORS');