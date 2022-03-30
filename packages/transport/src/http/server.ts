import { Inject, Injectable, lang, tokenId } from '@tsdi/ioc';
import { Chain, Endpoint, Middleware, MiddlewareFn, TransportServer } from '@tsdi/core';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { HttpContext } from './context';
import { HTTP_MIDDLEWARES } from './endpoint';

export type HttpVersion = 'http1.1' | 'http2';

export interface Http1ServerOptions {
    version: 'http1.1',
    options?: http.ServerOptions;
    secureOptions?: https.ServerOptions;
}
export interface Http2ServerOptions {
    version: 'http2',
    options?: http2.ServerOptions;
    secureOptions?: http2.SecureServerOptions;
}

export type HttpServerOptions = Http1ServerOptions | Http2ServerOptions;


export const HTTP_SERVEROPTIONS = tokenId<HttpServerOptions>('HTTP_SERVEROPTIONS');

@Injectable()
export class HttpServer extends TransportServer {

    private _endpoint!: Endpoint<HttpContext>;
    private _server!: http2.Http2Server | http.Server | https.Server;
    constructor(
        @Inject(HTTP_MIDDLEWARES) private middlewares: (Middleware<HttpContext> | MiddlewareFn<HttpContext>)[],
        @Inject(HTTP_SERVEROPTIONS) private options: HttpServerOptions) {
        super()
    }

    get endpoint(): Endpoint<HttpContext> {
        return this._endpoint;
    }

    async startup(): Promise<void> {
        let backend: Endpoint<HttpContext>;
        if (this.options.version === 'http2') {
            if (this.options.secureOptions) {
                this._server = http2.createSecureServer(this.options.secureOptions, (req, res)=> {

                });
            } else if (this.options.options) {
                this._server = http2.createServer(this.options.options);
            }
        } else {
            if (this.options.secureOptions) {
                this._server = https.createServer(this.options.secureOptions);
            } else if (this.options.options) {
                this._server = http.createServer(this.options.options);
            }
        }
        this._endpoint = new Chain(backend, this.middlewares);
    }

    createContext() {
        
    }

    async close(): Promise<void> {
        const defer = lang.defer();
        this._server.close((err) => {
            err ? defer.reject(err) : defer.resolve();
        });
        await defer.promise;
    }

}
