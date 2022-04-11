import { Chain, Endpoint, HttpRequest, HttpResponse, RequestMethod, TransportClient } from '@tsdi/core';
import { EMPTY_OBJ, Inject, Injectable, InvocationContext, lang, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Logger } from '@tsdi/logs';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { HttpContext } from './context';
import { HttpMiddleware, HTTP_MIDDLEWARES } from './endpoint';



export interface HttpSessionOptions {
    authority: string;
    options?: http2.ClientSessionOptions | http2.SecureClientSessionOptions;
}


const protocolChk = /^https:/;

export const HTTP_SESSIONOPTIONS = tokenId<HttpSessionOptions>('HTTP_SESSIONOPTIONS');


@Injectable()
export class HttpClient extends TransportClient<HttpRequest, HttpResponse> {

    private _endpoint!: Endpoint<HttpRequest, HttpResponse>;
    private http2client?: http2.ClientHttp2Session;

    constructor(
        @Inject() private context: InvocationContext,
        @Inject(HTTP_MIDDLEWARES) private middlewares: HttpMiddleware[],
        @Inject(HTTP_SESSIONOPTIONS, { defaultValue: EMPTY_OBJ }) private options: HttpSessionOptions) {
        super()
    }


    get endpoint(): Endpoint<HttpRequest, HttpResponse> {
        return this._endpoint;
    }

    async connect(): Promise<any> {
        this.context.setValue(Logger, this.logger);
        if (this.options.authority) {
            if (this.http2client && !this.http2client.closed) {
                return;
            }
            this.http2client = http2.connect(this.options.authority, this.options.options);
            this._endpoint = new Chain(new Http2BackEndpoint(this.http2client), this.middlewares);
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

    protected createContext(url: string | HttpRequest<any>, options?: { body?: any; method?: RequestMethod | undefined; headers?: any; context?: InvocationContext<any> | undefined; params?: any; observe?: 'body' | 'events' | 'response' | undefined; reportProgress?: boolean | undefined; responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | undefined; withCredentials?: boolean | undefined; }): HttpContext {
        const ctx = HttpContext.create(this.context.injector, {
            reponse: new HttpResponse(),
            request: new HttpRequest(options?.method || 'GET', url, { ...options })
        });
        return ctx;
    }

    async close(): Promise<void> {
        if (this.http2client) {
            const defer = lang.defer();
            this.http2client.close(() => defer.resolve());
            await defer.promise;
        }
    }

}

export class HttpBackEndpoint implements Endpoint<HttpRequest, HttpResponse> {
    constructor() {

    }

    endpoint(ctx: HttpRequest): Observable<any> {
        const client = this.options ? http.request(ctx.url, this.options) : http.request(ctx.url);
    }

}


export class Http2BackEndpoint implements Endpoint<HttpRequest, HttpResponse> {
    constructor(private client: http2.ClientHttp2Session) {

    }
    endpoint(req: HttpRequest): Observable<HttpResponse> {
        const reqt = this.client.request({
            path: req.url
        });
        const logger = req.context.getValue(Logger);

        reqt.on('response', (headers, flags) => {
            for (const name in headers) {
                logger.log(`${name}: ${headers[name]}`);
            }
        });

        reqt.setEncoding('utf8');
        reqt.on('data', (chunk) => { data += chunk; });
        reqt.on('end', () => {
            logger.log(`\n${data}`);
            this.client.close();
        });
        reqt.end();
    }

}
