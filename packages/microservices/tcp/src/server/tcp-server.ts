import { getTypeName, Inject, isNumber, isString, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    LOCALHOST, Events, createRequestContext, RequestContext,
    InternalServerException, ListenOpts, Transport
} from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, fromEvent, race, take, takeUntil } from 'rxjs';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { TcpServOptions, TCP_SERV_OPTIONS, TCP_BIND_INTERCEPTORS, TCP_BIND_FILTERS, TCP_BIND_GUARDS } from './options';
const SOCKET = Events.SOCKET;

/**
 * tcp server of `tcp` or `ipc`.
 */
@Injectable()
export class TcpServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    serv?: net.Server | tls.Server | null;

    @InjectLog() logger!: Logger;

    protected isSecure: boolean;

    private destroy$: Subject<void>;

    /**
     * Track active socket connections for proper shutdown
     */
    private activeConnections: Set<tls.TLSSocket | net.Socket> = new Set();

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(TCP_SERV_OPTIONS, { nullable: true }) protected options: TcpServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
        this.isSecure = !!(options.serverOpts as tls.TlsOptions)?.cert;
    }

    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this.serv) throw new InternalServerException();
        const options = this.options;
        const isSecure = options.secure = this.isSecure;
        const protocol = isSecure ? 'ssl' : 'tcp';
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                const host = arg2;
                if (!options.listenOpts) {
                    options.listenOpts = { host, port };
                }
                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://${host}:${port}`, '!');
                this.serv.listen(port, host, listeningListener);
            } else {
                listeningListener = arg2;
                if (!options.listenOpts) {
                    options.listenOpts = { host: LOCALHOST, port };
                }
                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://localhost:${port}`, '!');
                this.serv.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!options.listenOpts) {
                options.listenOpts = opts;
            }
            if (opts.host || opts.port) {
                this.logger.info(getTypeName(this), 'listen:', opts, '. access with url:', `${protocol}://${opts?.host ?? 'localhost'}:${opts?.port}${opts?.path ?? ''}`, '!');
            } else {
                this.logger.info(getTypeName(this), 'listen:', opts, '. access with IPC address:', opts.path, '!');
            }
            this.serv.listen(opts, listeningListener);
        }
        return this;
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: TCP_BIND_INTERCEPTORS,
        filtersToken: TCP_BIND_FILTERS,
        guardsToken: TCP_BIND_GUARDS
    })
    async bind(event: BindServiceEvent<any>) {
        if (this.serv || (isString(this.options.heybird) && event.transport !== this.options.heybird)) return;
        await this.onStart(event.server);
    }

    async onStart(bindServer?: net.Server | tls.Server): Promise<void> {

        if (this.options.heybird && !bindServer) return;

        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        if (!this.serv) {
            this.serv = bindServer || this.createServer();
        }

        const server = this.serv;
        server.on(Events.CLOSE, () => this.logger.info(this.options.microservice ? 'Tcp microservice closed!' : 'Tcp server closed!'));
        server.on(Events.ERROR, (err: Error) => this.logger.error(err));

        if (server instanceof tls.Server) {
            server.on(Events.SECURE_CONNECTION, (socket: tls.TLSSocket) => {
                this.handleMessage(socket);
            });
        } else {
            server.on(Events.CONNECTION, (socket: net.Socket) => {
                this.handleMessage(socket);
            });
        }

        if (!this.options.microservice && !bindServer) {
            // notify hybrid service to bind http server.
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.serv, Transport.TCP, this));
        }

        if (!bindServer) {
            if (!this.options.listenOpts) {
                this.options.listenOpts = { host: LOCALHOST, port: 3000 };
            }
            this.listen(this.options.listenOpts);
        }
    }

    async onShutdown(): Promise<void> {
        if (!this.serv) return;

        // Signal all handlers to stop
        this.destroy$.next();
        this.destroy$.complete();

        // Close all active connections gracefully
        for (const socket of this.activeConnections) {
            if (!socket.destroyed) {
                socket.end();
                // Force destroy after timeout if socket doesn't close gracefully
                setTimeout(() => {
                    if (!socket.destroyed) {
                        socket.destroy();
                    }
                }, 1000);
            }
        }
        this.activeConnections.clear();

        // Then close the server
        await promisify(this.serv.close, this.serv)()
            .finally(() => {
                this.serv?.removeAllListeners();
                this.serv = null;
            });

    }

    private createServer(): net.Server | tls.Server {
        return this.isSecure ? tls.createServer(this.options.serverOpts as tls.TlsOptions)
            : net.createServer(this.options.serverOpts as net.ServerOpts);
    }

    private handleMessage(socket: tls.TLSSocket | net.Socket) {
        // Track the active connection
        this.activeConnections.add(socket);

        // Remove from tracking when socket closes
        socket.once(Events.CLOSE, () => {
            this.activeConnections.delete(socket);
        });

        this.handler.handle(socket as TReq, createRequestContext(this.injector, [[SOCKET, socket]]))
            .pipe(
                takeUntil(race(this.destroy$, fromEvent(socket, Events.CLOSE), fromEvent(socket, Events.DISCONNECT)).pipe(take(1)))
            ).subscribe();
    }

}
