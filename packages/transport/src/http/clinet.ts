import { Endpoint, Middleware, MiddlewareFn, RequestMethod, ServerOption, TransportClient, TransportContext, TransportRequest } from '@tsdi/core';
import { Inject, Injectable, InvocationContext, lang, tokenId } from '@tsdi/ioc';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { HTTP_MIDDLEWARES } from './endpoint';
import { HttpContext } from './context';



export interface Http1ClientOptions {
    version: 'http1.1',
    url: string;
    options?: http.RequestOptions | https.RequestOptions;
}
export interface Http2ClientOptions {
    version: 'http2',
    url: string;
    options?: http2.ClientSessionOptions | http2.SecureClientSessionOptions;
}

export type HttpClientOptions = Http1ClientOptions | Http2ClientOptions;

const protocolChk = /^https:/;

export const HTTP_CLIENTOPTIONS = tokenId<HttpClientOptions>('HTTP_CLIENTOPTIONS');

@Injectable()
export class HttpClient extends TransportClient<HttpContext> {

    constructor(
        @Inject(HTTP_MIDDLEWARES) private middlewares: (Middleware<HttpContext> | MiddlewareFn<HttpContext>)[],
        @Inject(HTTP_CLIENTOPTIONS) private options: HttpClientOptions) {
        super()
    }


    get endpoint(): Endpoint<HttpContext> {
        throw new Error('Method not implemented.');
    }

    async connect(): Promise<any> {
        if (this.options.version === 'http2') {
            const listener = this.http2Listener.bind(this);
            http2.connect(this.options.url, this.options.options, listener);
        } else if (this.options.version === 'http1.1') {
            const url = this.options.url;
            const listener = this.http1Listener.bind(this);
            const secure = (this.options.options?.protocol && protocolChk.test(this.options.options?.protocol)) || protocolChk.test(url);
            if (secure) {
                return this.options.options ? https.request(url, this.options.options, listener) : https.request(url, listener);
            } else {
                return this.options.options ? http.request(url, this.options.options, listener) : http.request(url, listener);
            }

        }
    }

    protected createContext(pattern: string | TransportRequest<any>, options?: { body?: any; method?: RequestMethod | undefined; headers?: any; context?: InvocationContext<any> | undefined; params?: any; observe?: 'body' | 'events' | 'response' | undefined; reportProgress?: boolean | undefined; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | undefined; withCredentials?: boolean | undefined; }): HttpContext {
        throw new Error('Method not implemented.');
    }

    protected http1Listener(res: http.IncomingMessage): void {
    }

    protected http2Listener(session: http2.ClientHttp2Session, socket: Socket | TLSSocket): void {

    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }


}