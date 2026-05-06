import { asProvider, getClassRef, getTypeName, Inject, Injectable, Injector, Invocation, isNumber, isString, promisify, Provider } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    LOCALHOST, ListenOpts, ListenService, InternalServerException, Transport, createRequestHandler, Events, UrlIncoming,
    createRequestContext, RequestContext, TransferSide, NotFoundException, StatusAdapter, UrlOutgoingFactory,
    OutgoingFactory
} from '@tsdi/common';
import { SOCKET } from '@tsdi/transport';
import {
    BindServerEvent, FeatureKind, makeFeature, Server, getServiceToken, TransportFeature, REGISTER_SERVICES,
    ServiceHandler, getServiceBackendToken, SERV_OPTIONS
} from '@tsdi/endpoints';
import { Subject, fromEvent, of, race, take, takeUntil } from 'rxjs';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { TCP_BIND_FILTERS, TCP_BIND_GUARDS, TCP_BIND_INTERCEPTORS, TCP_SERV_OPTIONS, TcpServOptions } from './options';





/**
 * tcp server of `tcp` or `ipc`.
 */
@Injectable()
export class TcpServer<TReq = any, TRes = any> extends Server<TReq, TRes, RequestContext> implements ListenService {

    protected serv?: net.Server | tls.Server | null;

    @InjectLog() logger!: Logger;

    protected isSecure: boolean;

    private destroy$: Subject<void>;

    /**
     * Track active socket connections for proper shutdown
     */
    private activeConnections: Set<tls.TLSSocket | net.Socket> = new Set();

    constructor(
        readonly handler: ServiceHandler<any, any, RequestContext>,
        @Inject(TCP_SERV_OPTIONS, { nullable: true }) protected options: TcpServOptions,
    ) {
        super();

        this.destroy$ = new Subject();
        this.isSecure = !!(this.options.serverOpts as tls.TlsOptions)?.cert;
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
                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://${host}:${port}`, '!')
                this.serv.listen(port, host, listeningListener);
            } else {
                listeningListener = arg2;
                if (!options.listenOpts) {
                    options.listenOpts = { host: LOCALHOST, port };
                }
                this.logger.info(getTypeName(this), 'access with url:', `${protocol}://localhost:${port}`, '!')
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

    @EventHandler(BindServerEvent, {
        interceptorsToken: TCP_BIND_INTERCEPTORS,
        filtersToken: TCP_BIND_FILTERS,
        guardsToken: TCP_BIND_GUARDS
    })
    async bind(event: BindServerEvent<any>) {
        if (this.serv || (isString(this.options.heybird) && event.transport !== this.options.heybird)) return;
        await this.onStart(event.server);
    }

    protected override async onStart(bindServer?: any): Promise<any> {

        if (this.options.heybird && !bindServer) return;

        if (bindServer) {
            this.serv = bindServer;
        } else {
            await this.setup();
        }

        if (!this.serv) throw new InternalServerException();
        const injector = this.injector;
        injector.setValue(Logger, this.logger);

        this.serv.on(Events.CLOSE, () => this.logger.info(this.options.microservice ? 'Tcp microservice closed!' : 'Tcp server closed!'));
        this.serv.on(Events.ERROR, (err) => this.logger.error(err));

        if (this.serv instanceof tls.Server) {
            this.serv.on(Events.SECURE_CONNECTION, (socket) => {
                this.handleMessage(socket);
            })
        } else {
            this.serv.on(Events.CONNECTION, (socket) => {
                this.handleMessage(socket);
            })
        }

        if (!this.options.microservice && !bindServer) {
            // notify hybrid service to bind http server.
            await injector.get(ApplicationEventMulticaster).emit(new BindServerEvent(this.serv, this.options.transport, this));
        }

        if (!bindServer) {
            if (!this.options.listenOpts) {
                this.options.listenOpts = { host: LOCALHOST, port: 3000 };
            }
            this.listen(this.options.listenOpts)
        }
    }

    protected override async onShutdown(): Promise<any> {
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

    private async setup(): Promise<any> {
        this.serv = this.createServer();
    }

    private handleMessage(socket: tls.TLSSocket | net.Socket) {
        // Track the active connection
        this.activeConnections.add(socket);

        // Remove from tracking when socket closes
        socket.once(Events.CLOSE, () => {
            this.activeConnections.delete(socket);
        });

        this.handler.handle(socket, createRequestContext(this.injector, [[SOCKET, socket]]))
            .pipe(
                takeUntil(race(this.destroy$, fromEvent(socket, Events.CLOSE), fromEvent(socket, Events.DISCONNECT)).pipe(take(1)))
            ).subscribe();
    }

    private createServer(): net.Server | tls.Server {
        return this.isSecure ? tls.createServer(this.options.serverOpts as tls.TlsOptions)
            : net.createServer(this.options.serverOpts as net.ServerOpts);
    }

}



export function tcpTransportFactory(option: Partial<TcpServOptions>, asDefault?: boolean): TransportFeature {
    const config = {
        ...option,
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
        serverOpts: option.serverOpts ? { ...option.serverOpts } : undefined,
        // Preserve token references set by feature functions
        transfersToken: option.transfersToken,
        interceptorsToken: option.interceptorsToken,
        guardsToken: option.guardsToken,
        filtersToken: option.filtersToken,
        routerToken: option.routerToken,
        backendToken: option.backendToken
    } as TcpServOptions;
    config.transport = Transport.TCP;
    config.side = TransferSide.server;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    config.providers = [...(config.providers ?? [])];
    config.providers.push({ provide: SERV_OPTIONS, useExisting: TCP_SERV_OPTIONS });

    const providers: Provider[] = [
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        asProvider({
            provide: backendToken,
            useValue: (req: UrlIncoming, context): any => {
                const response = context.getResponse();
                const statusAdapter = context.get(StatusAdapter);
                response.error = new NotFoundException();
                if (statusAdapter) {
                    response.statusCode = statusAdapter.notFound;
                    response.statusMessage = response.error.message;
                }
                return of(response);
            },
            multi: true
        }),

        {
            provide: serviceToken,
            useFactory: (injector: Injector) => {
                return getClassRef(TcpServer).createInvocation(injector, {
                    providers: [
                        {
                            provide: TCP_SERV_OPTIONS,
                            useValue: config
                        },
                        {
                            provide: ServiceHandler,
                            useFactory: (injector: Injector) => createRequestHandler(injector, config),
                            deps: [
                                Injector
                            ]
                        }
                    ]
                })
            },
            deps: [
                Injector
            ]
        },
        {
            provide: REGISTER_SERVICES,
            useFactory: (service) => {
                return {
                    service,
                    bootstrap: config.bootstrap,
                    microservice: config.microservice
                }
            },
            deps: [
                serviceToken
            ],
            multi: true
        }
    ];

    if (asDefault) {
        providers.push({
            provide: TcpServer,
            useFactory: (inv: Invocation) => inv.instance,
            deps: [serviceToken]
        })
    }

    return makeFeature(FeatureKind.Transport, providers, config) as TransportFeature;
}

export function withTcpTransport(...options: Partial<TcpServOptions>[]): TransportFeature[] {
    return options.map(option => {
        return tcpTransportFactory(option, options.length === 1 && option.asDefault);
    })
}