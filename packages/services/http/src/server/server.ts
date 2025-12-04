import { Injectable, isFunction, lang, promisify, isNumber, isString, isNil } from '@tsdi/ioc';
import { ApplicationEventMulticaster, ModuleLoader } from '@tsdi/core';
import { ListenService } from '@tsdi/common';
import { InternalServerException } from '@tsdi/common/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { BindServerEvent, CONTENT_DISPOSITION_TOKEN, HttpServConfig, Server, ServerTransportFactory } from '@tsdi/endpoints';
import { Subject, lastValueFrom } from 'rxjs';
import { ListenOptions } from 'node:net';
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';
import * as assert from 'node:assert';
import { HttpRequestHandler } from './handler';
import { HttpContext } from './context';

/**
 * http server.
 */
@Injectable()
export class HttpServer extends Server<HttpContext, HttpServConfig> implements ListenService<ListenOptions> {

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

    listen(options: ListenOptions, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOptions | number, arg2?: any, listeningListener?: () => void): this {
        if (!this._server) throw new InternalServerException();
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
                const url = options.listenOpts!.url = `http${isSecure ? 's' : ''}://${host}:${port}`;
                this._server.listen(port, host, () => {
                    this.logger.info(lang.getTypeName(this), url, '!');
                    listeningListener?.();
                });
            } else {
                listeningListener = arg2;
                if (!options.listenOpts) {
                    options.listenOpts = { port };
                }
                // moduleRef.setValue(HTTP_LISTEN_OPTS, options.listenOpts);
                const url = options.listenOpts!.url = `http${isSecure ? 's' : ''}://localhost:${port}`;
                this._server.listen(port, () => {
                    this.logger.info(lang.getTypeName(this), 'access with url:', url, '!');
                    listeningListener?.();
                });
            }
        } else {
            const opts = arg1;
            if (!options.listenOpts) {
                options.listenOpts = opts;
            }
            // moduleRef.setValue(HTTP_LISTEN_OPTS, options.listenOpts);
            const url = options.listenOpts!.url = `http${isSecure ? 's' : ''}://${opts?.host ?? 'localhost'}:${opts?.port}${opts?.path ?? ''}`;
            this._server.listen(opts, () => {
                this.logger.info(lang.getTypeName(this), 'listen:', opts, '. access with url:', url, '!');
                listeningListener?.();
            });
        }
        return this;
    }

    async onStartup(): Promise<http2.Http2Server | http.Server | https.Server> {
        const opts = this.getOptions();
        this.validOptions(opts);

        const context = this.handler.context;

        context.setValue(HttpServer, this);
        const loader = context.get(ModuleLoader);
        if (context.has(CONTENT_DISPOSITION_TOKEN)) {
            const func = await loader.require('content-disposition');
            assert(isFunction(func), 'Can not found any Content Disposition provider. Require content-disposition module');
            context.setValue(CONTENT_DISPOSITION_TOKEN, func)
        }

        if (opts.controllers) {
            await loader.register(context, opts.controllers);
        }

        const option = opts.serverOpts;
        const isSecure = this.isSecure;
        if (!opts.transport) {
            opts.transport = this._secure ? 'https' : 'http';
        }
        if ((opts.majorVersion ?? 1) >= 2) {
            this._server = isSecure ? http2.createSecureServer(option as http2.SecureServerOptions)
                : http2.createServer(option as http2.ServerOptions);

        } else {
            this._server = isSecure ? https.createServer(option as http.ServerOptions)
                : http.createServer(option as https.ServerOptions);
        }

        if (!isNil(opts.timeout)) this._server.setTimeout(opts.timeout);

        return this._server;
    }

    protected override async onStart(): Promise<any> {
        await this.onStartup();
        if (!this._server) throw new InternalServerException();
        const opts = this.getOptions();

        const context = this.handler.context;
        const factory = context.get(ServerTransportFactory);
        const session = factory.create(context, this._server, opts);
        session.handle(this.handler, this.destroy$);

        // notify hybrid service to bind http server.
        await lastValueFrom(context.get(ApplicationEventMulticaster).publishEvent(new BindServerEvent(this._server, 'http', this)));

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
                this.logger.info(lang.getTypeName(this), opts.listenOpts, 'closed !');
            })
            .catch(err => {
                this.logger.error(err);
            })
            .finally(() => {
                this._server?.removeAllListeners();
                this._server = null;
            })
    }

    protected validOptions(opts: HttpServConfig) {
        const withCredentials = this._secure = opts.transport !== 'http' && !!(opts.serverOpts as any)?.cert;
        opts.listenOpts = { ...opts.listenOpts!, withCredentials, majorVersion: opts.majorVersion } as ListenOptions;
    }

}
