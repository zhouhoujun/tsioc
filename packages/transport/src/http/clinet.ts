import { Endpoint, Middleware, MiddlewareFn, RequestMethod, ServerOption, TransportClient, TransportContext, TransportRequest } from '@tsdi/core';
import { Inject, Injectable, InvocationContext, lang, tokenId } from '@tsdi/ioc';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { HTTP_MIDDLEWARES } from './endpoint';
import { HttpContext } from './context';



export interface Http1ClientOptions {
    version: 'http1.1',
    url: string;
    options?: http.RequestOptions;
    secureOptions?: https.RequestOptions;
}
export interface Http2ClientOptions {
    version: 'http2',
    url: string;
    options?: http2.ClientSessionOptions;
    secureOptions?: http2.SecureClientSessionOptions;
}

export type HttpClientOptions = Http1ClientOptions | Http2ClientOptions;


export const HTTP_CLIENTOPTIONS = tokenId<HttpClientOptions>('HTTP_CLIENTOPTIONS');

@Injectable()
export class HttpClient extends TransportClient {

    constructor(
        @Inject(HTTP_MIDDLEWARES) private middlewares: (Middleware<HttpContext> | MiddlewareFn<HttpContext>)[],
        @Inject(HTTP_CLIENTOPTIONS) private options: HttpClientOptions) {
        super()
    }


    get endpoint(): Endpoint<TransportContext<ServerOption>> {
        throw new Error('Method not implemented.');
    }
     
    async connect(): Promise<any> {
        
    }
    protected createContext(pattern: string | TransportRequest<any>, options?: { body?: any; method?: RequestMethod | undefined; headers?: any; context?: InvocationContext<any> | undefined; params?: any; observe?: 'body' | 'events' | 'response' | undefined; reportProgress?: boolean | undefined; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | undefined; withCredentials?: boolean | undefined; }): TransportContext<ServerOption> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }


}