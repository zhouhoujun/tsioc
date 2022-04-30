import { Abstract, EMPTY, EMPTY_OBJ, Inject, Injectable, Injector, InvocationContext, isFunction, isString, lang, Nullable, tokenId, Type } from '@tsdi/ioc';
import { InterceptorChain, Endpoint, Interceptor, InterceptorFn, RequestMethod, TransportClient, EndpointBackend, HttpRequest, HttpResponse, HttpEvent, OnDispose } from '@tsdi/core';
import { Observable } from 'rxjs';
import { Logger } from '@tsdi/logs';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { ev } from '../consts';


// export type HttpRequest = http.ClientRequest | http2.ClientHttp2Stream;

// export type HttpResponse = http

export const HTTP_CLIENT_INTERCEPTORS = tokenId<Interceptor<HttpRequest, HttpEvent>[]>('HTTP_CLIENT_INTERCEPTORS');

export type HttpSessionOptions = http2.ClientSessionOptions | http2.SecureClientSessionOptions;

const protocolChk = /^https:/;

export const HTTP_SESSIONOPTIONS = tokenId<HttpSessionOptions>('HTTP_SESSIONOPTIONS');

@Abstract()
export abstract class HttpClientOptions {
    abstract get majorVersion(): number;
    abstract get interceptors(): Type<Interceptor<HttpRequest, HttpEvent>>[] | undefined;
    abstract get options(): HttpSessionOptions | undefined;
}

export interface HttpRequestOptions {
    body?: any;
    method?: RequestMethod | undefined;
    headers?: any;
    params?: any;
    observe?: 'body' | 'events' | 'response' | undefined;
    reportProgress?: boolean | undefined;
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | undefined;
    withCredentials?: boolean | undefined;
}

/**
 * http client for nodejs
 */
@Injectable()
export class Http extends TransportClient<HttpRequest, HttpEvent, HttpRequestOptions> implements OnDispose {

    private _backend!: EndpointBackend<HttpRequest, HttpEvent>;
    private http2s: Map<string, http2.ClientHttp2Session>;

    constructor(
        @Inject() readonly context: InvocationContext,
        @Nullable() private options: HttpClientOptions) {
        super()
        this.http2s = new Map();
        const interceptors = this.options.interceptors?.map(m => {
            if (isFunction(m)) {
                return { provide: HTTP_CLIENT_INTERCEPTORS, useClass: m, multi: true };
            } else {
                return { provide: HTTP_CLIENT_INTERCEPTORS, useValue: m, multi: true };
            }
        }) ?? EMPTY;
        this.context.injector.inject(interceptors);
    }

    getInterceptors(): Interceptor[] {
        return this.context.get(HTTP_CLIENT_INTERCEPTORS) ?? EMPTY
    }

    getBackend(): EndpointBackend<HttpRequest, HttpResponse> {
        throw new Error('Method not implemented.');
    }

    protected async buildRequest(ctx: InvocationContext, url: string | HttpRequest, options?: HttpRequestOptions): Promise<HttpRequest> {
        if (isString(url)) {
            return new HttpRequest(options?.method ?? 'GET', url, options);
            // const uri = new URL(url);
            // if (this.options.majorVersion >= 2) {
            //     let client = this.http2s.get(uri.origin);
            //     if (!client) {
            //         client = http2.connect(uri.origin, this.options.options);
            //         client.on(ev.ERROR, err => {
            //             this.logger.error(err);
            //         });
            //     }
            //     const req = client.request({ ':path': uri.pathname });
            //     req.on(ev.DATA, buf => {

            //     });
            //     req.on(ev.END, () => {
            //         client?.close();
            //     })
            //     return req;
            // } else {
            //     const client = uri.protocol === 'https' ? https.request(uri) : http.request(uri);
            //     client.on('response',)
            //     return client;
            // }
        }
        return url;
    }

    async close(): Promise<void> {
        if (this.http2s.size < 1) return;
        await Promise.all(Array.from(this.http2s.values()).map(c => {
            const defer = lang.defer();
            c.close(() => defer.resolve());
            return defer.promise
        }));
        this.http2s.clear();
    }

    /**
     * on dispose.
     */
    onDispose(): Promise<void> {
        return this.close();
    }

}
