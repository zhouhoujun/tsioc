import { Inject, Injectable, InvocationContext, isFunction, lang, tokenId } from '@tsdi/ioc';
import { Chain, Endpoint, TransportServer } from '@tsdi/core';
import { Logger } from '@tsdi/logs';
import { fromEvent, of, race } from 'rxjs';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as assert from 'assert';
import { HttpContext, HTTP_MIDDLEWARES } from './context';
import { CONTENT_DISPOSITION } from './content';


export type HttpVersion = 'http1.1' | 'http2';

export interface Http1ServerOptions {
    version: 'http1.1',
    options?: http.ServerOptions | https.ServerOptions;
}
export interface Http2ServerOptions {
    version?: 'http2',
    options?: http2.ServerOptions | http2.SecureServerOptions;
}
const defaultOption = { version: 'http2' };
export type HttpServerOptions = Http1ServerOptions | Http2ServerOptions;

export const HTTP_SERVEROPTIONS = tokenId<HttpServerOptions>('HTTP_SERVEROPTIONS');

@Injectable()
export class HttpServer extends TransportServer<HttpContext> {

    private _endpoint!: Endpoint<HttpContext>;
    private _server!: http2.Http2Server | http.Server | https.Server;
    constructor(
        @Inject() private context: InvocationContext,
        @Inject(HTTP_SERVEROPTIONS, { defaultValue: defaultOption }) private options: HttpServerOptions
    ) {
        super();
    }

    get endpoint(): Endpoint {
        return this._endpoint;
    }

    async startup(): Promise<void> {
        const options = this.options;
        if (!options.version) {
            options.version = 'http2';
        }
        if (this.context.hasValue(CONTENT_DISPOSITION)) {
            const func = await this.context.injector.getLoader().require('content-disposition');
            assert(isFunction(func), 'Can not found any Content Disposition provider. Require content-disposition module');
            this.context.setValue(CONTENT_DISPOSITION, func);
        }
        this.context.setValue(Logger, this.logger);
        this._endpoint = new Chain((ctx) => {
            // const cb = ()=> ctx.destroy();
            // race([fromEvent(ctx.response, 'end'), fromEvent(ctx.response, 'end'), fromEvent( ctx.response, 'finish') ])
            //     .pipe((c)=> {

            //     })
            // ctx.response.once('close', cb);
            // ctx.response.once('error', )
            return of(ctx);
        }, this.context.resolve(HTTP_MIDDLEWARES));
        if (options.version === 'http2') {
            const handler = this.http2RequestHandler.bind(this);
            if (options.options) {
                this._server = (options.options as http2.SecureServerOptions)?.cert ?
                    http2.createSecureServer(options.options, handler) : http2.createServer(options.options, handler);
            } else {
                this._server = http2.createServer(handler);
            }
        } else {
            const handler = this.http1RequestHandler.bind(this);
            if (options.options) {
                this._server = (options.options as https.ServerOptions).cert ?
                 https.createServer(options.options as https.ServerOptions, handler) : http.createServer(options.options as http.ServerOptions, handler);
            } else {
                this._server = http.createServer(handler);
            }
        }
    }

    protected http1RequestHandler(request: http.IncomingMessage, response: http.ServerResponse) {
        const ctx = HttpContext.create(this.context.injector, {
            target: this,
            parent: this.context,
            request,
            response
        });

        this._endpoint.endpoint(ctx);
    }
    protected http2RequestHandler(request: http2.Http2ServerRequest, response: http2.Http2ServerResponse) {
        const ctx = HttpContext.create(this.context.injector, {
            target: this,
            parent: this.context,
            request,
            response
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
