import { getTypeName, Inject, isNumber, isString, promisify, Injectable, isNil } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    LOCALHOST, Events, createRequestContext, RequestContext,
    InternalServerException, ListenOpts, Transport, RESPONSE, REQUEST,
    StreamAdapter, ContentType, Outgoing, OutgoingFactory
} from '@tsdi/common';
import { HttpRequestMessage } from './http-context';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';
import { HttpServOptions, HTTP_SERV_OPTIONS, HTTP_BIND_INTERCEPTORS, HTTP_BIND_FILTERS, HTTP_BIND_GUARDS } from './options';

type HttpRequestLike = http.IncomingMessage | http2.Http2ServerRequest;
type HttpResponseLike = http.ServerResponse | http2.Http2ServerResponse;
type HttpServerLike = http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer;

@Injectable()
export class HttpServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    server?: HttpServerLike | null;

    @InjectLog() logger!: Logger;

    protected isSecure: boolean;
    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(HTTP_SERV_OPTIONS, { nullable: true }) protected options: HttpServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
        this.isSecure = !!(options.serverOpts as https.ServerOptions | http2.SecureServerOptions)?.cert;
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

    async onStart(bindServer?: HttpServerLike): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);
        this.validOptions();

        if (!this.server) {
            this.server = bindServer || this.createServer();
        }

        this.server.on('request', (req: HttpRequestLike, res: HttpResponseLike) => {
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

    private createServer(): HttpServerLike {
        const majorVersion = this.options.majorVersion ?? 1;
        if (majorVersion >= 2) {
            return this.isSecure
                ? http2.createSecureServer(this.options.serverOpts as http2.SecureServerOptions)
                : http2.createServer(this.options.serverOpts as http2.ServerOptions);
        }
        return this.isSecure
            ? https.createServer(this.options.serverOpts as https.ServerOptions)
            : http.createServer(this.options.serverOpts as http.ServerOptions);
    }

    private validOptions() {
        const hasCert = !!(this.options.serverOpts as any)?.cert;
        this.isSecure = hasCert || !!this.options.secure;
        const withCredentials = this.isSecure;
        this.options.listenOpts = {
            ...this.options.listenOpts,
            withCredentials,
            majorVersion: this.options.majorVersion
        } as ListenOpts;
    }

    private handleRequest(req: HttpRequestLike, res: HttpResponseLike) {
        const rawUrl = this.getRequestUrl(req);
        const url = this.getRequestPath(rawUrl);
        const method = this.getRequestMethod(req);
        const request = req as HttpRequestMessage;
        request.rawRequest = req;
        request.rawUrl = rawUrl;
        request.url = url;
        request.body = null;
        request.query = this.parseQuery(rawUrl);
        request.getHeader = (name: string) => {
            const value = req.headers?.[name.toLowerCase()] ?? req.headers?.[name as keyof typeof req.headers];
            return Array.isArray(value) ? String(value[0]) : value == null ? undefined : String(value);
        };
        request.hasHeader = (name: string) => request.getHeader(name) != null;
        request.getHeaderNames = () => Object.keys(req.headers ?? {});
        const context = createRequestContext(this.injector, [
            [REQUEST, request],
            [RESPONSE, this.createOutgoing(req)],
            ['request', request],
            ['response', res],
            ['url', url],
            ['rawUrl', rawUrl],
            ['method', method],
            ['headers', req.headers],
        ]);
        context.setPayload(request);

        this.handler.handle(request as TReq, context)
            .pipe(takeUntil(race(this.destroy$).pipe(take(1))))
            .subscribe({
                next: (response: any) => this.writeResponse(req, res, context, response),
                error: (err: any) => this.writeError(req, res, err)
            });
    }



    private createOutgoing(_req: HttpRequestLike): Outgoing<any> {
        return this.injector.get(OutgoingFactory).create({});
    }

    private writeResponse(req: HttpRequestLike, res: HttpResponseLike, context: RequestContext, response: any) {
        if (isNil(response)) {
            res.statusCode = 204;
            res.end();
            return;
        }

        const outgoing = this.toOutgoing(response, context);
        const streamAdapter = context.get(StreamAdapter);
        const status = outgoing ? outgoing.statusCode ?? 200 : 200;
        const contentType = outgoing?.getHeader?.('content-type') ?? context.getContentType();
        const payload = !isNil(outgoing?.body) ? outgoing.body : response;

        const headerNames = outgoing?.getHeaderNames?.() ?? [];
        headerNames.forEach((name: string) => {
            const value = outgoing?.getHeader?.(name);
            if (!isNil(value)) {
                res.setHeader(name, value as any);
            }
        });

        if (contentType && !res.hasHeader('content-type')) {
            res.setHeader('content-type', contentType);
        }

        if (!isNil(status)) {
            res.statusCode = status as number;
            if (req.httpVersionMajor < 2 && outgoing?.statusMessage) {
                res.statusMessage = outgoing.statusMessage;
            }
        }

        if (isNil(payload)) {
            res.end();
            return;
        }

        if (this.getRequestMethod(req)?.toUpperCase() === 'HEAD') {
            res.end();
            return;
        }

        if (streamAdapter.isStream(payload)) {
            streamAdapter.pipeTo(payload, res as any, { end: true }).catch(err => this.logger.error(err));
            return;
        }

        if (!res.hasHeader('content-type') && typeof payload !== 'string' && !Buffer.isBuffer(payload)) {
            res.setHeader('content-type', ContentType.APPL_JSON_UTF8);
        }
        res.end(typeof payload === 'string' || Buffer.isBuffer(payload) ? payload : JSON.stringify(payload));
    }

    private writeError(req: HttpRequestLike, res: HttpResponseLike, err: any) {
        this.logger.error(err);
        const status = err?.statusCode ?? err?.status ?? 500;
        res.statusCode = status;
        if (req.httpVersionMajor < 2 && err?.statusMessage) {
            res.statusMessage = err.statusMessage;
        }
        if (err?.headers && typeof err.headers === 'object') {
            Object.entries(err.headers).forEach(([name, value]) => {
                if (!isNil(value) && !res.hasHeader(name)) {
                    res.setHeader(name, value as any);
                }
            });
        }
        if (!res.hasHeader('content-type')) {
            res.setHeader('content-type', ContentType.APPL_JSON_UTF8);
        }
        if (this.getRequestMethod(req)?.toUpperCase() === 'HEAD') {
            res.end();
            return;
        }
        res.end(JSON.stringify({ statusCode: status, message: err?.message ?? String(err) }));
    }

    private toOutgoing(response: any, context: RequestContext): Outgoing<any> | null {
        if (!response) {
            return null;
        }
        if (typeof response.getHeader === 'function' && typeof response.setHeader === 'function') {
            return response as Outgoing<any>;
        }
        const outgoing = context.getResponse();
        if (response === outgoing) {
            return outgoing;
        }
        outgoing.body = response;
        return outgoing;
    }


    private getRequestUrl(req: HttpRequestLike): string | undefined {
        return req.url ?? (req.headers[':path'] as string | undefined);
    }

    private getRequestMethod(req: HttpRequestLike): string | undefined {
        return req.method ?? (req.headers[':method'] as string | undefined);
    }

    private getRequestPath(url?: string | null): string | undefined {
        if (!url) {
            return undefined;
        }
        const idx = url.indexOf('?');
        return idx >= 0 ? url.slice(0, idx) : url;
    }

    private parseQuery(url?: string | null) {
        if (!url) {
            return {};
        }
        const idx = url.indexOf('?');
        if (idx < 0 || idx === url.length - 1) {
            return {};
        }
        return Object.fromEntries(new URLSearchParams(url.slice(idx + 1)).entries());
    }
}
