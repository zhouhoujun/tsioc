import { getTypeName, Inject, isNumber, isString, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    LOCALHOST, Events, createRequestContext, RequestContext,
    InternalServerException, ListenOpts, Transport, REQUEST, RESPONSE, OutgoingFactory
} from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, fromEvent, race, take, takeUntil } from 'rxjs';
import * as http from 'node:http';
import * as https from 'node:https';
import { WebSocketServer, WebSocket } from 'ws';
import { WsServOptions, WS_SERV_OPTIONS, WS_BIND_INTERCEPTORS, WS_BIND_FILTERS, WS_BIND_GUARDS } from './options';
import { SOCKET } from '../context';

/**
 * WebSocket server for microservices.
 * WebSocket 微服务服务器
 */
@Injectable()
export class WsServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    server?: http.Server | https.Server | null;
    wss?: WebSocketServer | null;

    @InjectLog() logger!: Logger;

    protected isSecure: boolean;

    private destroy$: Subject<void>;

    /**
     * Track active WebSocket connections for proper shutdown
     * 跟踪活跃的 WebSocket 连接以便正确关闭
     */
    private activeConnections: Set<WebSocket> = new Set();

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(WS_SERV_OPTIONS, { nullable: true }) protected options: WsServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
        this.isSecure = !!(options.serverOpts as https.ServerOptions)?.cert;
    }

    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this.server) throw new InternalServerException();
        const options = this.options;
        const protocol = this.isSecure ? 'wss' : 'ws';
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                const host = arg2;
                if (!options.listenOpts) {
                    options.listenOpts = { host, port };
                }
                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://${host}:${port}${options.path || ''}`, '!');
                this.server.listen(port, host, listeningListener);
            } else {
                listeningListener = arg2;
                if (!options.listenOpts) {
                    options.listenOpts = { host: LOCALHOST, port };
                }
                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://localhost:${port}${options.path || ''}`, '!');
                this.server.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!options.listenOpts) {
                options.listenOpts = opts;
            }
            if (opts.host || opts.port) {
                this.logger.info(getTypeName(this), 'listen:', opts, '. access with url:', `${protocol}://${opts?.host ?? 'localhost'}:${opts?.port}${options.path || ''}`, '!');
            }
            this.server.listen(opts, listeningListener);
        }
        return this;
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: WS_BIND_INTERCEPTORS,
        filtersToken: WS_BIND_FILTERS,
        guardsToken: WS_BIND_GUARDS
    })
    async bind(event: BindServiceEvent<any>) {
        if (this.server || (isString(this.options.heybird) && event.transport !== this.options.heybird)) return;
        await this.onStart(event.server);
    }

    async onStart(bindServer?: http.Server | https.Server): Promise<void> {

        if (this.options.heybird && !bindServer) return;

        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        if (!this.server) {
            this.server = bindServer || this.createServer();
        }

        // Create WebSocket server attached to HTTP server
        this.wss = new WebSocketServer({
            server: this.server,
            path: this.options.path
        });

        const server = this.server;
        server.on(Events.CLOSE, () => this.logger.info(this.options.microservice ? 'WebSocket microservice closed!' : 'WebSocket server closed!'));
        server.on(Events.ERROR, (err: Error) => this.logger.error(err));

        // Handle WebSocket connections
        this.wss.on(Events.CONNECTION, (ws: WebSocket, request: http.IncomingMessage) => {
            this.handleConnection(ws, request);
        });

        if (!this.options.microservice && !bindServer) {
            // Notify hybrid service to bind http server
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.server, Transport.WS, this));
        }

        if (!bindServer) {
            if (!this.options.listenOpts) {
                this.options.listenOpts = { host: LOCALHOST, port: 3000 };
            }
            this.listen(this.options.listenOpts);
        }
    }

    async onShutdown(): Promise<void> {
        if (!this.server) return;

        // Signal all handlers to stop
        this.destroy$.next();
        this.destroy$.complete();

        // Close all active WebSocket connections gracefully
        for (const ws of this.activeConnections) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1001, 'Server shutdown');
            }
        }
        this.activeConnections.clear();

        // Close WebSocket server first
        if (this.wss) {
            await promisify(this.wss.close, this.wss)().catch(err => this.logger.error('WebSocket server close error:', err));
            this.wss = null;
        }

        // Then close the HTTP server
        await promisify(this.server.close, this.server)()
            .finally(() => {
                this.server?.removeAllListeners();
                this.server = null;
            });
    }

    private createServer(): http.Server | https.Server {
        return this.isSecure ? https.createServer(this.options.serverOpts as https.ServerOptions)
            : http.createServer(this.options.serverOpts as http.ServerOptions);
    }

    private handleConnection(ws: WebSocket, request: http.IncomingMessage) {
        // Track the active connection
        this.activeConnections.add(ws);

        // Remove from tracking when connection closes
        ws.once(Events.CLOSE, () => {
            this.activeConnections.delete(ws);
        });

        // Handle errors
        ws.on(Events.ERROR, (err: Error) => {
            this.logger.error('WebSocket connection error:', err);
        });

        const outgoing = this.injector.get(OutgoingFactory).create({});
        const context = createRequestContext(this.injector, [
            [SOCKET, ws],
            [REQUEST, request],
            [RESPONSE, outgoing],
        ]);

        // Handle messages through service handler
        this.handler.handle(ws as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$, fromEvent(ws, Events.CLOSE)).pipe(take(1)))
            ).subscribe();
    }

}
