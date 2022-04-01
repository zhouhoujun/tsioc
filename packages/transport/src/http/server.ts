import { Inject, Injectable, InvocationContext, lang, tokenId } from '@tsdi/ioc';
import { Chain, Endpoint, TransportServer } from '@tsdi/core';
import { of } from 'rxjs';
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
    constructor(@Inject() private context: InvocationContext) {
        super()
    }

    get endpoint(): Endpoint<HttpContext> {
        return this._endpoint;
    }

    async startup(): Promise<void> {
        this._endpoint = new Chain((ctx) => of(ctx), this.context.resolve(HTTP_MIDDLEWARES));
        const options = this.context.resolve(HTTP_SERVEROPTIONS);
        if (options.version === 'http2') {
            const handler = this.http2RequestHandler.bind(this);
            if (options.secureOptions) {
                this._server = http2.createSecureServer(options.secureOptions, handler);
            } else if (options.options) {
                this._server = http2.createServer(options.options, handler);
            }
        } else {
            const handler = this.http1RequestHandler.bind(this);
            if (options.secureOptions) {
                this._server = https.createServer(options.secureOptions, handler);
            } else if (options.options) {
                this._server = http.createServer(options.options, handler);
            }
        }
    }

    protected http1RequestHandler(request: http.IncomingMessage, reponse: http.ServerResponse) {
        const ctx = HttpContext.create(this.context.injector, {
            parent: this.context,
            request,
            reponse
        });

        this._endpoint.endpoint(ctx);
    }
    protected http2RequestHandler(request: http2.Http2ServerRequest, reponse: http2.Http2ServerResponse) {
        const ctx = HttpContext.create(this.context.injector, {
            parent: this.context,
            request,
            reponse
        });
        this._endpoint.endpoint(ctx);
    }

    async close(): Promise<void> {
        const defer = lang.defer();
        this._server.close((err) => {
            err ? defer.reject(err) : defer.resolve();
        });
        await defer.promise;
    }

}
