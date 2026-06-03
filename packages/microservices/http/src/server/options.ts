import { token, ProvdierOf } from '@tsdi/ioc';
import { ListenOpts, Transport, RequestInterceptorLike, FindOptions, Header } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';

export interface HttpStaticOptions extends FindOptions {
    enabled?: boolean;
    disposition?: 'inline' | 'attachment';
    headers?: Record<string, Header>;
    immutable?: boolean;
    maxAge?: number;
    setHeaders?: (adapter: any, path: string, stats: any) => void;
}

export interface HttpUploadOptions {
    enabled?: boolean;
    limit?: string;
}

export interface HttpServOptions extends ServiceOptions {
    transport: Transport.HTTP;
    providers?: ProvdierOf<any>[];
    interceptors?: ProvdierOf<RequestInterceptorLike>[];
    listenOpts?: ListenOpts;
    serverOpts?: http.ServerOptions | https.ServerOptions | http2.ServerOptions | http2.SecureServerOptions;
    secure?: boolean;
    majorVersion?: number;
    timeout?: number;
    static?: boolean | HttpStaticOptions | HttpStaticOptions[];
    upload?: boolean | HttpUploadOptions;
}

export const HTTP_SERV_OPTIONS = token<HttpServOptions>('HTTP_SERV_OPTIONS');
export const HTTP_SERV_INTERCEPTORS = token<any[]>('HTTP_SERV_INTERCEPTORS');
export const HTTP_SERV_FILTERS = token<any[]>('HTTP_SERV_FILTERS');
export const HTTP_SERV_GUARDS = token<any[]>('HTTP_SERV_GUARDS');
export const HTTP_BIND_INTERCEPTORS = token<any[]>('HTTP_BIND_INTERCEPTORS');
export const HTTP_BIND_FILTERS = token<any[]>('HTTP_BIND_FILTERS');
export const HTTP_BIND_GUARDS = token<any[]>('HTTP_BIND_GUARDS');
