import { getTypeName, Inject, isNumber, isString, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    LOCALHOST, Events, createRequestContext, RequestContext,
    InternalServerException, ListenOpts, RestfulRequestAdapter, Transport, REQUEST,
} from '@tsdi/common'
import { HttpRequestMessage, HTTP_RESPONSE } from './http-context';
import { HttpMessageAdapter } from './message-adapter';
import { HttpMessageAdapterFactory } from './message-adapter.factory';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';
import * as net from 'node:net';
import { HttpServOptions, HTTP_SERV_OPTIONS, HTTP_BIND_INTERCEPTORS, HTTP_BIND_FILTERS, HTTP_BIND_GUARDS } from './options';

type HttpRequestLike = http.IncomingMessage | http2.Http2ServerRequest;
type HttpResponseLike = http.ServerResponse | http2.Http2ServerResponse;
type HttpServerLike = http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer;

function readRequestHeader(this: HttpRequestMessage, name: string): string | undefined {
    const headers = this.headers;
    const value = headers?.[name.toLowerCase()] ?? headers?.[name as keyof typeof headers];
    return Array.isArray(value) ? String(value[0]) : value == null ? undefined : String(value);
}

function hasRequestHeader(this: HttpRequestMessage, name: string): boolean {
    return readRequestHeader.call(this, name) != null;
}

function requestHeaderNames(this: HttpRequestMessage): string[] {
    return Object.keys(this.headers ?? {});
}

function decodeQueryPart(value: string): string {
    if (value.indexOf('%') === -1) {
        return value;
    }
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

@Injectable()
export class HttpServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    server?: HttpServerLike | null;

    @InjectLog() logger!: Logger;

    readonly isSecure: boolean;
    private destroy$: Subject<void>;
    private activeConnections: Set<net.Socket> = new Set();
    private activeHttp2Sessions: Set<http2.ServerHttp2Session> = new Set();
    private adapterFactory?: HttpMessageAdapterFactory;

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

                this.server.listen(port, arg2, listeningListener);

                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://${arg2}:${port}`, '!');

            } else {
                listeningListener = arg2;
                if (!this.options.listenOpts) this.options.listenOpts = { port };
                this.server.listen(port, listeningListener);
                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://localhost:${port}`, '!');
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) this.options.listenOpts = opts;
            this.server.listen(opts, listeningListener ?? arg2);
            if (opts.host || opts.port) {
                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://${opts.host ?? 'localhost'}:${opts.port}`, '!');
            }
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

        const server = this.server;
        server.on('request', (req: HttpRequestLike, res: HttpResponseLike) => {
            this.handleRequest(req, res);
        });

        server.on(Events.ERROR, (err: Error) => this.logger.error(err));
        server.on(Events.CONNECTION, (socket: net.Socket) => this.trackConnection(socket));

        if (this.options.majorVersion && this.options.majorVersion >= 2) {
            server.on('session', (session: http2.ServerHttp2Session) => this.trackHttp2Session(session));
        }

        if (!this.options.microservice && !bindServer) {
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(server, Transport.HTTP, this));
        }

        if (!bindServer) {
            if (!this.options.listenOpts) this.options.listenOpts = { host: LOCALHOST, port: 3000 };
            await new Promise<void>((resolve, reject) => {
                const cleanup = () => {
                    server.off('listening', onListening);
                    server.off('error', onError);
                };
                const onListening = () => {
                    cleanup();
                    resolve();
                };
                const onError = (err: Error) => {
                    cleanup();
                    reject(err);
                };
                server.once('listening', onListening);
                server.once('error', onError);
                this.listen(this.options.listenOpts!);
            });
        }
    }

    async onShutdown(): Promise<void> {
        if (!this.server) return;
        this.destroy$.next();
        this.destroy$.complete();
        const server = this.server;

        this.closeHttp2Sessions();
        this.closeConnections();

        if (typeof (server as any).unref === 'function') {
            (server as any).unref();
        }

        if (typeof (server as any).closeIdleConnections === 'function') {
            (server as any).closeIdleConnections();
        }
        if (typeof (server as any).closeAllConnections === 'function') {
            (server as any).closeAllConnections();
        }
        try {
            await promisify(server.close, server)();
        } catch (err: any) {
            if (err?.code !== 'ERR_SERVER_NOT_RUNNING') {
                throw err;
            }
        }

        server.removeAllListeners();
        this.activeConnections.clear();
        this.activeHttp2Sessions.clear();
        this.server = null;
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
        const withCredentials = this.isSecure;
        this.options.listenOpts = {
            ...this.options.listenOpts,
            withCredentials,
            majorVersion: this.options.majorVersion
        } as ListenOpts;
    }

    private handleRequest(req: HttpRequestLike, res: HttpResponseLike) {
        const rawUrl = this.getRequestUrl(req);
        const queryStart = rawUrl.indexOf('?');
        const url = queryStart === -1 ? rawUrl : (rawUrl.slice(0, queryStart) || '/');
        const method = this.getRequestMethod(req);
        const request = req as HttpRequestMessage;
        request.rawRequest = req;
        request.rawUrl = rawUrl;
        request.url = url;
        request.body = null;
        request.query = this.parseQuery(rawUrl, queryStart);
        request.getHeader = readRequestHeader;
        request.hasHeader = hasRequestHeader;
        request.getHeaderNames = requestHeaderNames;
        const context = createRequestContext(this.injector, [
            [REQUEST, request],
            [HTTP_RESPONSE, res],
        ]);
        const factory = this.adapterFactory ?? (this.adapterFactory = this.injector.get(HttpMessageAdapterFactory));
        const adapter = factory.create({ request, response: res, context });
        context.setMessageAdapter(adapter);
        context.set(HttpMessageAdapter, adapter);
        context.set(RestfulRequestAdapter, adapter);
        context.setPayload(request);

        this.handler.handle(request as TReq, context)
            .pipe(
                takeUntil(this.destroy$),
            )
            .subscribe({
                error: (err) => this.logger.error(err)
            });
    }

    private trackConnection(socket: net.Socket) {
        this.activeConnections.add(socket);
        socket.once(Events.CLOSE, () => this.activeConnections.delete(socket));
    }

    private trackHttp2Session(session: http2.ServerHttp2Session) {
        this.activeHttp2Sessions.add(session);
        session.once(Events.CLOSE, () => this.activeHttp2Sessions.delete(session));
    }

    private closeConnections() {
        for (const socket of this.activeConnections) {
            if (typeof (socket as any).unref === 'function') {
                (socket as any).unref();
            }
            if (!socket.destroyed) {
                socket.destroy();
            }
        }
    }

    private closeHttp2Sessions() {
        for (const session of this.activeHttp2Sessions) {
            if (session.closed || session.destroyed) {
                continue;
            }
            try {
                const socket = (session as any).socket;
                if (socket && typeof socket.unref === 'function') {
                    socket.unref();
                }
            } catch {
                // ignore socket unref errors during shutdown
            }
            try {
                session.close();
            } catch {
                // ignore close errors during shutdown
            }
            if (!session.closed && !session.destroyed) {
                session.destroy();
            }
        }
    }

    private getRequestUrl(req: HttpRequestLike): string {
        if ((req as http2.Http2ServerRequest).stream) {
            return ((req as http2.Http2ServerRequest).headers[':path'] as string) || '/';
        }
        return req.url || '/';
    }

    private parseQuery(rawUrl: string, queryStart: number): Record<string, string> {
        const query: Record<string, string> = {};
        if (queryStart < 0) {
            return query;
        }
        const length = rawUrl.length;
        let index = queryStart + 1;
        while (index < length) {
            let end = rawUrl.indexOf('&', index);
            if (end < 0) {
                end = length;
            }
            if (end > index) {
                const entry = rawUrl.slice(index, end);
                const eq = entry.indexOf('=');
                const key = eq < 0 ? entry : entry.slice(0, eq);
                if (key) {
                    const value = eq < 0 ? '' : entry.slice(eq + 1);
                    query[decodeQueryPart(key)] = decodeQueryPart(value);
                }
            }
            index = end + 1;
        }
        return query;
    }

    private getRequestMethod(req: HttpRequestLike): string {
        if ((req as http2.Http2ServerRequest).stream) {
            return String((req as http2.Http2ServerRequest).headers[':method'] || req.method || 'GET');
        }
        return req.method || 'GET';
    }
}
