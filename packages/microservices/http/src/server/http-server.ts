import { getTypeName, Inject, isNumber, isString, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    LOCALHOST, Events, createRequestContext, RequestContext,
    InternalServerException, ListenOpts, Transport
} from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import * as http from 'node:http';
import * as https from 'node:https';
import { HttpServOptions, HTTP_SERV_OPTIONS, HTTP_BIND_INTERCEPTORS, HTTP_BIND_FILTERS, HTTP_BIND_GUARDS } from './options';

@Injectable()
export class HttpServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    server?: http.Server | https.Server | null;

    @InjectLog() logger!: Logger;

    protected isSecure: boolean;
    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(HTTP_SERV_OPTIONS, { nullable: true }) protected options: HttpServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
        this.isSecure = !!(options.serverOpts as https.ServerOptions)?.cert;
    }

    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this.server) throw new InternalServerException();
        const protocol = this.isSecure ? 'https' : 'http';
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                if (!this.options.listenOpts) this.options.listenOpts = { host: arg2, port };
                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://${arg2}:${port}`, '!');
                this.server.listen(port, arg2, listeningListener);
            } else {
                listeningListener = arg2;
                if (!this.options.listenOpts) this.options.listenOpts = { host: LOCALHOST, port };
                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://localhost:${port}`, '!');
                this.server.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) this.options.listenOpts = opts;
            if (opts.host || opts.port) {
                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://${opts.host ?? 'localhost'}:${opts.port}`, '!');
            }
            this.server.listen(opts, listeningListener);
        }
        return this;
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: HTTP_BIND_INTERCEPTORS,
        filtersToken: HTTP_BIND_FILTERS,
        guardsToken: HTTP_BIND_GUARDS
    })
    async bind(_event: BindServiceEvent<any>) {
        if (this.server) return;
        await this.onStart();
    }

    async onStart(bindServer?: http.Server | https.Server): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        if (!this.server) {
            this.server = bindServer || this.createServer();
        }

        this.server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
            this.handleRequest(req, res);
        });

        this.server.on(Events.ERROR, (err: Error) => this.logger.error(err));

        if (!this.options.microservice && !bindServer) {
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.server, Transport.HTTP, this));
        }

        if (!bindServer) {
            if (!this.options.listenOpts) this.options.listenOpts = { host: LOCALHOST, port: 3000 };
            this.listen(this.options.listenOpts);
        }
    }

    async onShutdown(): Promise<void> {
        if (!this.server) return;
        this.destroy$.next();
        this.destroy$.complete();
        await promisify(this.server.close.bind(this.server))()
            .finally(() => { this.server?.removeAllListeners(); this.server = null; });
    }

    private createServer(): http.Server | https.Server {
        return this.isSecure ? https.createServer(this.options.serverOpts as https.ServerOptions)
            : http.createServer(this.options.serverOpts as http.ServerOptions);
    }

    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
            const body = Buffer.concat(chunks).toString();
            const context = createRequestContext(this.injector, [
                ['request', req],
                ['url', req.url],
                ['method', req.method],
                ['headers', req.headers],
            ]);

            let parsed: any = body || null;
            try { if (body) parsed = JSON.parse(body); } catch { /* keep as string */ }

            const requestData = { body: parsed, url: req.url, method: req.method, headers: req.headers };

            this.handler.handle(requestData as TReq, context)
                .pipe(takeUntil(race(this.destroy$).pipe(take(1))))
                .subscribe((response: any) => {
                    if (response) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(typeof response === 'string' ? response : JSON.stringify(response));
                    } else {
                        res.writeHead(204);
                        res.end();
                    }
                });
        });
    }
}
