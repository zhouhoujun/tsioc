import { EMPTY_OBJ, Inject, Injectable, InvocationContext, lang, tokenId } from '@tsdi/ioc';
import { InterceptorChain, Endpoint, Interceptor, InterceptorFn, RequestMethod, TransportClient, EndpointBackend } from '@tsdi/core';
import { Observable } from 'rxjs';
import { Logger } from '@tsdi/logs';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { HttpMiddleware, HTTP_MIDDLEWARES } from './endpoint';
import { HttpRequest } from './request';
import { HttpResponse } from './response';



export interface HttpSessionOptions {
    authority: string;
    options?: http2.ClientSessionOptions | http2.SecureClientSessionOptions;
}


const protocolChk = /^https:/;

export const HTTP_SESSIONOPTIONS = tokenId<HttpSessionOptions>('HTTP_SESSIONOPTIONS');


@Injectable()
export class Http extends TransportClient<HttpRequest, HttpResponse> {
    

    private _endpoint!: Endpoint<HttpRequest, HttpResponse>;
    private http2client?: http2.ClientHttp2Session;

    constructor(
        @Inject() private context: InvocationContext,
        @Inject(HTTP_SESSIONOPTIONS, { defaultValue: EMPTY_OBJ }) private options: HttpSessionOptions) {
        super()
    }

    getBackend(): EndpointBackend<HttpRequest<any>, HttpResponse<any>> {
        throw new Error('Method not implemented.');
    }

    async connect(): Promise<any> {
        this.context.setValue(Logger, this.logger);
        if (this.options.authority) {
            if (this.http2client && !this.http2client.closed) {
                return;
            }
            this.http2client = http2.connect(this.options.authority, this.options.options);
        } else {

            if (this._endpoint) return;
            // const url = this.options.url;
            // let client: http.ClientRequest;
            // const secure = (this.options.options?.protocol && protocolChk.test(this.options.options?.protocol)) || protocolChk.test(url);
            // if (secure) {
            //     client = this.options.options ? https.request(url, this.options.options) : https.request(url);
            // } else {
            //     client = this.options.options ? http.request(url, this.options.options) : http.request(url);
            // }
            // const defer = lang.defer();
            // client.on('connect', (res, socket) => {
            //     this._endpoint = new Chain(new Http1BackEndpoint(client), this.middlewares);
            //     defer.resolve(res);
            // });
            // client.on('error', defer.reject);
            // await defer.promise;
        }
    }

    protected buildRequest(url: string | HttpRequest<any>, options?: { body?: any; method?: RequestMethod | undefined; headers?: any; context?: InvocationContext<any> | undefined; params?: any; observe?: 'body' | 'events' | 'response' | undefined; reportProgress?: boolean | undefined; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | undefined; withCredentials?: boolean | undefined; }): HttpRequest {
        throw new Error('Method not implemented.');
    }

    async close(): Promise<void> {
        if (!this.http2client) return;
        const defer = lang.defer();
        this.http2client.close(() => defer.resolve());
        await defer.promise;

    }

}
