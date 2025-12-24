import { asProvider, getClassRef, getTypeName, Inject, Injectable, Injector, isNil, isNumber, isString, promisify, Provider } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { LOCALHOST, ListenOpts, ListenService, InternalServerException, Transport, createRequestHandler, Events, createRequestContext, RequestContext, writePacket, StreamAdapter, TransferSide, NotFoundException, ResponseFactory, WritableLike, Outgoing, StatusAdapter, UrlOutgoingFactory, UrlIncoming } from '@tsdi/common';
import { BindServerEvent, FeatureKind, makeFeature, Server, getServiceToken, TransportFeature, REGISTER_SERVICES, ServiceHandler, getServiceBackendToken, DefaultExceptionHandlers, AbstractRequestContext, SERVICE_CONFIGS, withFeatures } from '@tsdi/endpoints';
import { Subject, filter, first, fromEvent, isObservable, lastValueFrom, merge, mergeMap, of, race, share, take, takeUntil, throwError } from 'rxjs';
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

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
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
        this.serv.on(Events.CLOSE, () => this.logger.info(this.options.microservice ? 'Tcp microservice closed!' : 'Tcp server closed!'));
        this.serv.on(Events.ERROR, (err) => this.logger.error(err));
        const context = this.handler.context;
        const streamAdapter = context.get(StreamAdapter);
        if (this.serv instanceof tls.Server) {
            this.serv.on(Events.SECURE_CONNECTION, (socket) => {
                this.handleMessage(socket, streamAdapter);
            })
        } else {
            this.serv.on(Events.CONNECTION, (socket) => {
                this.handleMessage(socket, streamAdapter);
            })
        }

        if (!this.options.microservice && !bindServer) {
            // notify hybrid service to bind http server.
            await context.get(ApplicationEventMulticaster).emit(new BindServerEvent(this.serv, this.options.transport, this));
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
        this.destroy$.next();
        this.destroy$.complete();
        await promisify(this.serv.close, this.serv)()
            .finally(() => {
                this.serv?.removeAllListeners();
                this.serv = null;
            });

    }

    private async setup(): Promise<any> {
        this.serv = this.createServer();
    }

    private handleMessage(socket: tls.TLSSocket | net.Socket, streamAdapter: StreamAdapter) {
        fromEvent(socket, Events.DATA).pipe(
            takeUntil(race(this.destroy$, fromEvent(socket, Events.CLOSE), fromEvent(socket, Events.DISCONNECT)).pipe(take(1))),
            filter(data => !isNil(data)),
            share(),
            mergeMap((data: any) => this.handler.handle(data, createRequestContext(this.context))),
            mergeMap(async (res: any) => {
                if (!res) return;
                // if (isObservable(res)) {
                //     res = await lastValueFrom(res);
                // }
                return await writePacket(socket, res, streamAdapter);
            }),
        ).subscribe();
    }

    private createServer(): net.Server | tls.Server {
        return this.isSecure ? tls.createServer(this.options.serverOpts as tls.TlsOptions)
            : net.createServer(this.options.serverOpts as net.ServerOpts);
    }

}



export function tcpTransportFactory(option: Partial<TcpServOptions>, asDefault?: boolean): TransportFeature {
    option.transport = Transport.TCP;
    option.side = TransferSide.server;

    // option.execptionHandlers ??= [DefaultExceptionHandlers];
    const config = option as TcpServOptions;
    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);

    const providers: Provider[] = [
        TcpServer,
        UrlOutgoingFactory,
        asProvider({
            provide: backendToken,
            useValue: (req: UrlIncoming, context): any => {
                const response = (context as AbstractRequestContext).response ?? context.get(UrlOutgoingFactory).create({ url: req.url });
                const statusAdapter = context.get(StatusAdapter);
                response.error = new NotFoundException();
                if (statusAdapter) {
                    response.statusCode = statusAdapter.notFound;
                    response.statusMessage = response.error.message;
                }
                return  of(response);
            },
            // useFactory: () => {
            //     let socket: tls.TLSSocket | net.Socket;
            //     return (data: any, context) => {
            //         const currSocket = context.get(SOCKET) as tls.TLSSocket | net.Socket;
            //         if (!currSocket) throw new ArgumentException('no socket in context');

            //         if (socket !== currSocket) {
            //             if (socket) {
            //                 socket.removeAllListeners();
            //             }
            //             socket = currSocket;
            //         }

            //         const emit$ = writePacket(socket, data, context.get(StreamAdapter));
            //         return from(emit$);
            //     }
            // },
            multi: true
        }),

        {
            provide: serviceToken,
            useFactory: (injector: Injector) => {
                return getClassRef(TcpServer).createInvocation(injector, {
                    providers: [
                        {
                            provide: TCP_SERV_OPTIONS,
                            useValue: option
                        },
                        {
                            provide: ServiceHandler,
                            useFactory: (injector: Injector) => createRequestHandler(injector, option),
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
                    bootstrap: option.bootstrap,
                    microservice: option.microservice
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
            useExisting: serviceToken
        })
    }

    return makeFeature(FeatureKind.Transport, providers, config) as TransportFeature;
}

export function withTcpTransport(...options: Partial<TcpServOptions>[]): TransportFeature[] {
    return options.map(option => {
        return tcpTransportFactory(option, options.length === 1 && option.asDefault);
    })
}