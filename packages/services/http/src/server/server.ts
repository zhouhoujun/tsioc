import { Inject, Injectable, isFunction, lang, EMPTY_OBJ, promisify, isNumber, isString, ModuleRef, ProvdierOf, ArgumentExecption } from '@tsdi/ioc';
import { ApplicationEventMulticaster, ModuleLoader } from '@tsdi/core';
import { ListenService } from '@tsdi/common';
import { InternalServerExecption } from '@tsdi/common/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { BindServerEvent, CONTENT_DISPOSITION_TOKEN, DefaultMiddlewareHandler, MiddlewareLike, MiddlewareService, Server, TransportSessionFactory } from '@tsdi/endpoints';
import { Subject, lastValueFrom } from 'rxjs';
import { ListenOptions } from 'net';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as assert from 'assert';
import { HttpServerOpts } from './options';
import { HttpRequestHandler } from './handler';
import { HttpContext } from './context';

/**
 * http server.
 */
@Injectable()
export class HttpServer extends Server<HttpContext, HttpServerOpts> implements ListenService<ListenOptions>, MiddlewareService {

    @InjectLog() logger!: Logger;
    private destroy$: Subject<void>;

    constructor(readonly handler: HttpRequestHandler) {
        super()
        this.destroy$ = new Subject();
    }


    private _secure?: boolean;
    get isSecure() {
        return this._secure === true
    }

    _server?: http2.Http2Server | http.Server | https.Server | null;

    use(middlewares: ProvdierOf<MiddlewareLike> | ProvdierOf<MiddlewareLike>[], order?: number | undefined): this {
        const endpoint = this.handler as DefaultMiddlewareHandler<HttpContext, HttpServerOpts>;
        if (isFunction(endpoint.use)) {
            endpoint.use(middlewares, order);
        } else {
            throw new ArgumentExecption('Not support middlewares');
        }
        return this;
    }


    listen(options: ListenOptions, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOptions | number, arg2?: any, listeningListener?: () => void): this {
        if (!this._server) throw new InternalServerExecption();
        const isSecure = this.isSecure;
        const options = this.getOptions();
        // const moduleRef = this.handler.injector.get(ModuleRef);
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                const host = arg2;
                if (!options.listenOpts) {
                    options.listenOpts = { host, port };
                }
                // moduleRef.setValue(HTTP_LISTEN_OPTS, options.listenOpts);
                this._server.listen(port, host, () => {
                    this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://${host}:${port}`, '!');
                    listeningListener?.();
                });
            } else {
                listeningListener = arg2;
                if (!options.listenOpts) {
                    options.listenOpts = { port };
                }
                // moduleRef.setValue(HTTP_LISTEN_OPTS, options.listenOpts);
                this._server.listen(port, () => {
                    this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://localhost:${port}`, '!');
                    listeningListener?.();
                });
            }
        } else {
            const opts = arg1;
            if (!options.listenOpts) {
                options.listenOpts = opts;
            }
            // moduleRef.setValue(HTTP_LISTEN_OPTS, options.listenOpts);
            this._server.listen(opts, () => {
                this.logger.info(lang.getClassName(this), 'listen:', opts, '. access with url:', `http${isSecure ? 's' : ''}://${opts?.host ?? 'localhost'}:${opts?.port}${opts?.path ?? ''}`, '!');
                listeningListener?.();
            });
        }
        return this;
    }

    async onStartup(): Promise<http2.Http2Server | http.Server | https.Server> {
        const opts = this.getOptions();
        this.validOptions(opts);

        const injector = this.handler.injector;

        injector.setValue(HttpServer, this);
        const loader = injector.get(ModuleLoader);
        if (injector.has(CONTENT_DISPOSITION_TOKEN)) {
            const func = await loader.require('content-disposition');
            assert(isFunction(func), 'Can not found any Content Disposition provider. Require content-disposition module');
            injector.setValue(CONTENT_DISPOSITION_TOKEN, func)
        }

        if (opts.controllers) {
            await loader.register(injector, opts.controllers);
        }

        const option = opts.serverOpts ?? EMPTY_OBJ;
        const isSecure = this.isSecure;
        if (!opts.protocol) {
            opts.protocol = this._secure ? 'https' : 'http';
        }
        if (opts.majorVersion >= 2) {
            this._server = isSecure ? http2.createSecureServer(option as http2.SecureServerOptions)
                : http2.createServer(option as http2.ServerOptions);

        } else {
            this._server = isSecure ? https.createServer(option as http.ServerOptions)
                : http.createServer(option as https.ServerOptions);
        }

        return this._server;
    }

    protected override async onStart(): Promise<any> {
        await this.onStartup();
        if (!this._server) throw new InternalServerExecption();
        const opts = this.getOptions();

        const injector = this.handler.injector;
        const factory = injector.get(TransportSessionFactory);
        const session = factory.create(injector, this._server, opts);
        session.listen(this.handler, this.destroy$);

        // notify hybrid service to bind http server.
        await lastValueFrom(injector.get(ApplicationEventMulticaster).publishEvent(new BindServerEvent(this._server, 'http', this)));

        if (opts.listenOpts) {
            this.listen(opts.listenOpts);
        }
    }

    protected override async onShutdown(): Promise<void> {
        if (!this._server) return;
        this.destroy$.next();
        this.destroy$.complete();
        const opts = this.getOptions();
        await promisify(this._server.close, this._server)()
            .then(() => {
                this.logger.info(lang.getClassName(this), opts.listenOpts, 'closed !');
            })
            .catch(err => {
                this.logger.error(err);
            })
            .finally(() => {
                this._server?.removeAllListeners();
                this._server = null;
            })
    }

    protected validOptions(opts: HttpServerOpts) {
        const withCredentials = this._secure = opts.protocol !== 'http' && !!(opts.serverOpts as any)?.cert;
        opts.listenOpts = { ...opts.listenOpts!, withCredentials, majorVersion: opts.majorVersion } as ListenOptions;
    }

}
