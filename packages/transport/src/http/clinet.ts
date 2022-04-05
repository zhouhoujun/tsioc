import { Chain, Endpoint, RequestMethod, TransportClient, TransportRequest } from '@tsdi/core';
import { Inject, Injectable, InvocationContext, lang, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Logger } from '@tsdi/logs';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { Socket } from 'net';
import { TLSSocket } from 'tls';
import { HttpContext, HttpMiddleware, HTTP_MIDDLEWARES } from './context';



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

    private http2client?: http2.ClientHttp2Session;
    private _endpoint!: Endpoint<HttpContext>;

    constructor(
        @Inject() private context: InvocationContext,
        @Inject(HTTP_MIDDLEWARES) private middlewares: HttpMiddleware[],
        @Inject(HTTP_CLIENTOPTIONS) private options: HttpClientOptions) {
        super()
    }


    get endpoint(): Endpoint<HttpContext> {
        return this._endpoint;
    }

    async connect(): Promise<any> {
        this.context.setValue(Logger, this.logger);
        if (this.options.version === 'http2') {
            if (this.http2client && !this.http2client.closed) {
                return;
            }
            this.http2client = http2.connect(this.options.url, this.options.options);
            this._endpoint = new Chain(new Http2BackEndpoint(this.http2client), this.middlewares);
        } else if (this.options.version === 'http1.1') {
            const url = this.options.url;
            let client: http.ClientRequest;
            const secure = (this.options.options?.protocol && protocolChk.test(this.options.options?.protocol)) || protocolChk.test(url);
            if (secure) {
                client = this.options.options ? https.request(url, this.options.options) : https.request(url);
            } else {
                client = this.options.options ? http.request(url, this.options.options) : http.request(url);
            }
            const defer = lang.defer();
            client.on('connect', (res, socket) => {
                this._endpoint = new Chain(new Http1BackEndpoint(client), this.middlewares);
                defer.resolve(res);
            });
            client.on('error', defer.reject);
            await defer.promise;
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

export class HttpBackEndpoint implements Endpoint<HttpContext> {
    constructor(private options: http.RequestOptions) {

    }

    endpoint(ctx: HttpContext): Observable<HttpContext> {
        const client = this.options ? http.request(ctx.pattern, this.options) : http.request(ctx.pattern);
    }

}


export class Http2BackEndpoint implements Endpoint<HttpContext> {
    constructor(private client: http2.ClientHttp2Session) {

    }
    endpoint(ctx: HttpContext): Observable<HttpContext> {
        const req = this.client.request({
            path: ctx.pattern
        });

        req.on('response', (headers, flags) => {
            for (const name in headers) {
                console.log(`${name}: ${headers[name]}`);
            }
        });

        req.setEncoding('utf8');
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => {
            console.log(`\n${data}`);
            this.client.close();
        });
        req.end();
    }

}
