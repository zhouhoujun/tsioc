import { ArgumentException, asProvider, composeInterceptors, getClassRef, getTypeName, Inject, Injectable, Injector, isNumber, isString, promisify, Provider } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { LOCALHOST, ListenOpts, ListenService, InternalServerException, Transport, createRequestHandler, Event, createRequestContext, RequestContext, RequestInterceptorFn, writePacket, StreamAdapter, TransferSide } from '@tsdi/common';
import { BindServerEvent, FeatureKind, makeFeature, Server, getServiceToken, TransportFeature, REGISTER_SERVICES, ServiceHandler, getServiceBackendToken, getTransfersToken } from '@tsdi/endpoints';
import { Observable, Subject, first, from, fromEvent, merge } from 'rxjs';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { TCP_BIND_FILTERS, TCP_BIND_GUARDS, TCP_BIND_INTERCEPTORS, TCP_SERV_CONFIG, TcpServConfig } from './options';
import { SOCKET, UrlIncoming } from '@tsdi/common/transport';
import { TcpRequest } from '../client/request';



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
        @Inject(TCP_SERV_CONFIG, { nullable: true }) protected options: TcpServConfig,
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
        const protocol = options.transport = options.transport ?? (isSecure ? 'ssl' : 'tcp');
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

    protected async setup(): Promise<any> {
        this.serv = this.createServer();
    }

    protected async onStart(bindServer?: any): Promise<any> {

        if (this.options.heybird && !bindServer) return;

        if (bindServer) {
            this.serv = bindServer;
        } else {
            await this.setup();
        }

        if (!this.serv) throw new InternalServerException();
        this.serv.on(Event.CLOSE, () => this.logger.info(this.options.microservice ? 'Tcp microservice closed!' : 'Tcp server closed!'));
        this.serv.on(Event.ERROR, (err) => this.logger.error(err));
        const context = this.handler.context;
        // const factory = context.get(ServerTransportFactory);

        if (this.serv instanceof tls.Server) {
            this.serv.on(Event.SECURE_CONNECTION, (socket) => {
                merge(this.destroy$, fromEvent(socket, Event.CLOSE), fromEvent(socket, Event.DISCONNECT)).pipe(first())
                    .subscribe((data: any) => {
                        if (!data) return;
                        this.handler.handle(data, createRequestContext(this.context))
                    })

                // const transport = factory.create(context, socket, options);
                // transport.handle(this.handler, merge(this.destroy$, fromEvent(socket, Event.CLOSE), fromEvent(socket, Event.DISCONNECT)).pipe(first()));
            })
        } else {
            this.serv.on(Event.CONNECTION, (socket) => {
                merge(this.destroy$, fromEvent(socket, Event.CLOSE), fromEvent(socket, Event.DISCONNECT)).pipe(first())
                    .subscribe((data: any) => {
                        if (!data) return;
                        this.handler.handle(data, createRequestContext(this.context))
                    });
                // const transport = factory.create(context, socket, options);
                // transport.handle(this.handler, merge(this.destroy$, fromEvent(socket, Event.CLOSE), fromEvent(socket, Event.DISCONNECT)).pipe(first()));
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

    protected async onShutdown(): Promise<any> {
        if (!this.serv) return;
        this.destroy$.next();
        this.destroy$.complete();
        await promisify(this.serv.close, this.serv)()
            .finally(() => {
                this.serv?.removeAllListeners();
                this.serv = null;
            });

    }

    protected createServer(): net.Server | tls.Server {
        return this.isSecure ? tls.createServer(this.options.serverOpts as tls.TlsOptions)
            : net.createServer(this.options.serverOpts as net.ServerOpts);
    }

}


export function withTcpTransport(...options: Partial<TcpServConfig>[]): TransportFeature[] {
    return options.map(option => {
        option.transport = Transport.TCP;
        option.side = TransferSide.server;
        const config = option as TcpServConfig;
        const serviceToken = getServiceToken(config);
        const backendToken = getServiceBackendToken(config);

        const providers: Provider[] = [
            TcpServer,
            // {
            //     provide: hanlderToken,
            //     useFactory: (injector: Injector) => {
            //         return createRequestHandler(injector, option)
            //     }
            // },
            // {
            //     provide: serviceToken,
            //     useClass: TcpServer,
            //     deps: [
            //         hanlderToken
            //     ]
            // },

            asProvider({
                provide: backendToken,
                useFactory: () => {
                    let socket: tls.TLSSocket | net.Socket;
                    return (data: any, context) => {

                        const currSocket = context.get(SOCKET) as tls.TLSSocket | net.Socket;
                        if (!currSocket) throw new ArgumentException('no socket in context');

                        if (socket !== currSocket) {
                            if (socket) {
                                socket.removeAllListeners();
                            }
                            socket = currSocket;
                        }

                        const emit$ = writePacket(socket, data, context.get(StreamAdapter));
                        return from(emit$);
                    }
                },
                multi: true
            }),

            {
                provide: serviceToken,
                useFactory: (injector: Injector) => {
                    return getClassRef(TcpServer).createInvocation(injector, {
                        providers: [
                            {
                                provide: TCP_SERV_CONFIG,
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

        return makeFeature(FeatureKind.Transport, providers, config) as TransportFeature;
    })
}