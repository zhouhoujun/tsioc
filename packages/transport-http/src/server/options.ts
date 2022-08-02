import { ExecptionFilter, Interceptor, ServerOpts, TransportServer } from '@tsdi/core';
import { tokenId, Type } from '@tsdi/ioc';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { ListenOptions } from 'net';
import { CorsOptions, MimeSource, ContentOptions, SessionOptions, CsrfOptions } from '@tsdi/transport';
import { HttpServRequest, HttpServResponse } from './context';

/**
 * http options.
 */
 export interface HttpOpts extends ServerOpts<HttpServRequest, HttpServResponse> {
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
    content?: boolean | ContentOptions;
    session?: boolean | SessionOptions;
    listenOpts?: ListenOptions;
    csrf?: boolean | CsrfOptions;
    /**
     * share with thie http server.
     * eg. ws, socket.io server.
     */
    sharing?: Type<TransportServer<any, any>>[];
}

export interface Http1ServerOpts extends HttpOpts {
    majorVersion: 1,
    protocol?: 'http' | 'https';
    options?: http.ServerOptions | https.ServerOptions;
}
export interface Http2ServerOpts extends HttpOpts {
    majorVersion: 2,
    protocol?: 'http' | 'https';
    options?: http2.ServerOptions | http2.SecureServerOptions;
}

/**
 * http server options.
 */
export type HttpServerOpts = Http1ServerOpts | Http2ServerOpts;


/**
 * http server opptions.
 */
export const HTTP_SERVEROPTIONS = tokenId<HttpServerOpts>('HTTP_SERVEROPTIONS');


export const HTTP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTION_FILTERS');

/**
 * http server Interceptor tokens for {@link HttpServer}.
 */
export const HTTP_SERV_INTERCEPTORS = tokenId<Interceptor<HttpServRequest, HttpServResponse>[]>('HTTP_SERV_INTERCEPTORS');