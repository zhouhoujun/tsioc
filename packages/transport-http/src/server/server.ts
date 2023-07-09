import { Inject, Injectable, isFunction, lang, EMPTY_OBJ, promisify, isNumber, isString, ModuleRef } from '@tsdi/ioc';
import { MiddlewareServer, ModuleLoader, ListenService, InternalServerExecption, HTTP_LISTEN_OPTS, HYBRID_HOST } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logs';
import { CONTENT_DISPOSITION, ev } from '@tsdi/transport';
import { Subscription, finalize } from 'rxjs';
import { ListenOptions } from 'net';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as assert from 'assert';
import { HttpContext, HttpServRequest, HttpServResponse } from './context';
import { HttpServerOpts, HTTP_SERV_OPTS } from './options';
import { HttpEndpoint } from './endpoint';


/**
 * http server.
 */
@Injectable()
export class HttpServer extends MiddlewareServer<HttpContext, HttpServResponse> implements ListenService<ListenOptions>  {

    @InjectLog() logger!: Logger;

    constructor(readonly endpoint: HttpEndpoint, @Inject(HTTP_SERV_OPTS, { nullable: true }) readonly options: HttpServerOpts) {
        super()
        this.validOptions(options);
    }

    private _secure?: boolean;
    get isSecure() {
        return this._secure === true
    }

    _server?: http2.Http2Server | http.Server | https.Server;


    listen(options: ListenOptions, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOptions | number, arg2?: any, listeningListener?: () => void): this {
        if (!this._server) throw new InternalServerExecption();
        const isSecure = this.isSecure;

        const moduleRef = this.endpoint.injector.get(ModuleRef);
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                const host = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { host, port };
                }
                moduleRef.setValue(HTTP_LISTEN_OPTS, this.options.listenOpts);
                this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://${host}:${port}`, '!')
                this._server.listen(port, host, listeningListener);
            } else {
                listeningListener = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { port };
                }
                moduleRef.setValue(HTTP_LISTEN_OPTS, this.options.listenOpts);
                this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://localhost:${port}`, '!')
                this._server.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) {
                this.options.listenOpts = opts;
            }
            moduleRef.setValue(HTTP_LISTEN_OPTS, this.options.listenOpts);
            this.logger.info(lang.getClassName(this), 'listen:', opts, '. access with url:', `http${isSecure ? 's' : ''}://${opts?.host ?? 'localhost'}:${opts?.port}${opts?.path ?? ''}`, '!');
            this._server.listen(opts, listeningListener);
        }
        return this;
    }


    protected async onStartup(): Promise<http2.Http2Server | http.Server | https.Server> {
        const opts = this.options;
        const injector = this.endpoint.injector;

        injector.setValue(HttpServer, this);
        const loader = injector.get(ModuleLoader);
        if (injector.has(CONTENT_DISPOSITION)) {
            const func = await loader.require('content-disposition');
            assert(isFunction(func), 'Can not found any Content Disposition provider. Require content-disposition module');
            injector.setValue(CONTENT_DISPOSITION, func)
        }

        if (opts.controllers) {
            await loader.register(injector, opts.controllers);
        }

        const option = opts.serverOpts ?? EMPTY_OBJ;
        const isSecure = this.isSecure;
        if (opts.majorVersion === 2) {
            this._server = isSecure ? http2.createSecureServer(option as http2.SecureServerOptions)
                : http2.createServer(option as http2.ServerOptions);

        } else {
            this._server = isSecure ? https.createServer(option as http.ServerOptions)
                : http.createServer(option as https.ServerOptions);
        }
        injector.get(ModuleRef).setValue(HYBRID_HOST, this._server);
        return this._server;
    }

    protected override async onStart(): Promise<any> {
        if (!this._server) throw new InternalServerExecption();
        const opts = this.options;
        // const injector = this.endpoint.injector;
        // const hybrids = opts.hybrids;
        // //hybrids servers
        // if (hybrids) {
        //     injector.setValue(HYBRID_HOST, this._server);
        //     const runners = injector.get(ApplicationRunners);
        //     await Promise.all(hybrids.map(sr => {
        //         return runners.run(sr);
        //     }))
        // }

        this._server.on(ev.REQUEST, (req, res) => this.requestHandler(req, res));
        this._server.on(ev.CLOSE, () => this.logger.info('Http server closed!'));
        this._server.on(ev.ERROR, (err) => this.logger.error(err));

        if (opts.listenOpts && opts.autoListen) {
            this.listen(opts.listenOpts);
        }
    }

    protected override async onShutdown(): Promise<void> {
        if (!this._server) return;
        await promisify(this._server.close, this._server)()
            .then(() => {
                this.logger.info(lang.getClassName(this), this.options.listenOpts, 'closed !');
            })
            .catch(err => {
                this.logger.error(err);
            })
            .finally(() => {
                this._server?.removeAllListeners()
            })
    }

    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(req: HttpServRequest, res: HttpServResponse): Subscription {
        const ctx = this.createContext(req, res);
        const cancel = this.endpoint.handle(ctx)
            .pipe(finalize(() => ctx.destroy()))
            .subscribe({
                error: (err) => {
                    this.logger.error(err)
                }
            });
        const opts = this.options;
        opts.timeout && req.setTimeout && req.setTimeout(opts.timeout, () => {
            req.emit?.(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }


    protected validOptions(opts: HttpServerOpts) {
        const withCredentials = this._secure = opts.protocol !== 'http' && !!(opts.serverOpts as any).cert;
        opts.listenOpts = { ...opts.listenOpts!, withCredentials, majorVersion: opts.majorVersion } as ListenOptions;
    }

    protected createContext(req: HttpServRequest, res: HttpServResponse): HttpContext {
        return new HttpContext(this.endpoint.injector, req, res, this.options);
    }



}

