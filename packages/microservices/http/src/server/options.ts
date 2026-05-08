import { token, ProvdierOf } from '@tsdi/ioc';
import { ListenOpts, Transport, RequestInterceptorLike } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';

export interface HttpServOptions extends ServiceOptions {
    transport: Transport.HTTP;
    providers?: ProvdierOf<any>[];
    interceptors?: ProvdierOf<RequestInterceptorLike>[];
    listenOpts?: ListenOpts;
    serverOpts?: http.ServerOptions | https.ServerOptions | http2.ServerOptions<typeof http.IncomingMessage, typeof http.ServerResponse> | http2.SecureServerOptions<typeof http.IncomingMessage, typeof http.ServerResponse>;
    secure?: boolean;
    majorVersion?: number;
    timeout?: number;
}

export const HTTP_SERV_OPTIONS = token<HttpServOptions>('HTTP_SERV_OPTIONS');
export const HTTP_SERV_INTERCEPTORS = token<any[]>('HTTP_SERV_INTERCEPTORS');
export const HTTP_SERV_FILTERS = token<any[]>('HTTP_SERV_FILTERS');
export const HTTP_SERV_GUARDS = token<any[]>('HTTP_SERV_GUARDS');
export const HTTP_BIND_INTERCEPTORS = token<any[]>('HTTP_BIND_INTERCEPTORS');
export const HTTP_BIND_FILTERS = token<any[]>('HTTP_BIND_FILTERS');
export const HTTP_BIND_GUARDS = token<any[]>('HTTP_BIND_GUARDS');
