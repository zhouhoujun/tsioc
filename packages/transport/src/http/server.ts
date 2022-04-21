import { Inject, Injectable, InvocationContext, isFunction, lang, tokenId } from '@tsdi/ioc';
import { InterceptorChain, Endpoint, HttpEvent, Interceptor, InterceptorFn, TransportContext, TransportServer, EndpointBackend, TransportContextFactory } from '@tsdi/core';
import { Logger } from '@tsdi/logs';
import { fromEvent, of, race } from 'rxjs';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as assert from 'assert';
import { CONTENT_DISPOSITION } from './content';
import { HTTP_MIDDLEWARES } from './endpoint';
import { HttpRequest } from './request';
import { HttpResponse, HttpServerResponse } from './response';


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
export class HttpServer extends TransportServer<HttpRequest, HttpServerResponse> {


    private _endpoint!: Endpoint<HttpRequest, HttpServerResponse>;
    private _server?: http2.Http2Server | http.Server | https.Server;
    constructor(
        @Inject() private context: InvocationContext,
        @Inject(HTTP_SERVEROPTIONS, { defaultValue: defaultOption }) private options: HttpServerOptions
    ) {
        super();
    }

    get contextFactory(): TransportContextFactory<HttpRequest<any>, HttpServerResponse> {
        throw new Error('Method not implemented.');
    }

    getBackend(): EndpointBackend<HttpRequest<any>, HttpServerResponse> {
        throw new Error('Method not implemented.');
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
        const ctx = TransportContext.create(this.context, {
            target: this
        });
        const req = new HttpRequest(ctx, request);
        const resp = new HttpServerResponse(ctx, response);
        ctx.response = resp;

        this.chain().handle(req);
    }
    protected http2RequestHandler(request: http2.Http2ServerRequest, response: http2.Http2ServerResponse) {
        const ctx = TransportContext.create(this.context, {
            target: this
        });
        const req = new HttpRequest(ctx, request);
        const resp = new HttpServerResponse(ctx, response);
        ctx.response = resp;
        this.chain().handle(req);
    }

    async close(): Promise<void> {
        if(!this._server) return;
        const defer = lang.defer();
        this._server.close((err) => {
            if(err) {
                this.logger.error(err);
                defer.reject(err);
            } else {
                defer.resolve();
            }
        });
        await defer.promise;
    }

}
