import { getClassRef, getTypeName, Injectable, Injector, isNumber, isString, promisify, Provider } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { LOCALHOST, ListenOpts, ListenService, InternalServerException, TransportConfig, Transport, createRequestHandler } from '@tsdi/common';
import { ev } from '@tsdi/common/transport';
import { BindServerEvent, FeatureKind, FeatureLike, makeFeature, AbstractRequestContext, Server, getServiceHandlerToken, getServiceToken, FeatureFn, TransportFeature, REGISTER_SERVICES, RegisterService } from '@tsdi/endpoints';
import { Subject, first, fromEvent, lastValueFrom, merge } from 'rxjs';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { TCP_BIND_FILTERS, TCP_BIND_GUARDS, TCP_BIND_INTERCEPTORS, TcpServConfig } from './options';
import { TcpRequestHandler } from './handler';
import { TcpHandler } from '../client/handler';



/**
 * tcp server of `tcp` or `ipc`. 
 */
@Injectable()
export class TcpServer extends Server<AbstractRequestContext, TcpServConfig> implements ListenService {

    protected serv?: net.Server | tls.Server | null;

    @InjectLog() logger!: Logger;

    protected isSecure: boolean;

    private destroy$: Subject<void>;

    constructor(
        readonly handler: TcpRequestHandler,
    ) {
        super();

        this.destroy$ = new Subject();
        this.isSecure = !!(this.getOptions().serverOpts as tls.TlsOptions)?.cert;
    }

    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this.serv) throw new InternalServerException();
        const options = this.getOptions();
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
        const options = this.getOptions();
        if (this.serv || (isString(options.heybird) && event.transport !== options.heybird)) return;
        await this.onStart(event.server);
    }

    protected async setup(): Promise<any> {
        const opts = this.getOptions();
        this.serv = this.createServer(opts);
    }

    protected async onStart(bindServer?: any): Promise<any> {
        const options = this.getOptions();
        if (options.heybird && !bindServer) return;

        if (bindServer) {
            this.serv = bindServer;
        } else {
            await this.setup();
        }

        if (!this.serv) throw new InternalServerException();

        this.serv.on(ev.CLOSE, () => this.logger.info(options.microservice ? 'Tcp microservice closed!' : 'Tcp server closed!'));
        this.serv.on(ev.ERROR, (err) => this.logger.error(err));
        const context = this.handler.context;
        const factory = context.get(ServerTransportFactory);

        if (this.serv instanceof tls.Server) {
            this.serv.on(ev.SECURE_CONNECTION, (socket) => {
                const transport = factory.create(context, socket, options);
                transport.handle(this.handler, merge(this.destroy$, fromEvent(socket, ev.CLOSE), fromEvent(socket, ev.DISCONNECT)).pipe(first()));
            })
        } else {
            this.serv.on(ev.CONNECTION, (socket) => {
                const transport = factory.create(context, socket, options);
                transport.handle(this.handler, merge(this.destroy$, fromEvent(socket, ev.CLOSE), fromEvent(socket, ev.DISCONNECT)).pipe(first()));
            })
        }

        if (!options.microservice && !bindServer) {
            // notify hybrid service to bind http server.
            await context.get(ApplicationEventMulticaster).emit(new BindServerEvent(this.serv, 'tcp', this));
        }

        if (!bindServer) {
            if (!options.listenOpts) {
                options.listenOpts = { host: LOCALHOST, port: 3000 };
            }
            this.listen(options.listenOpts)
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

    protected createServer(opts: TcpServConfig): net.Server | tls.Server {
        return this.isSecure ? tls.createServer(opts.serverOpts as tls.TlsOptions) : net.createServer(opts.serverOpts as net.ServerOpts);
    }

}


export function withTcpTransport(...options: TcpServConfig[]): TransportFeature[] {
    return options.map(option => {
        const config: TransportConfig = { transport: Transport.TCP, name: option.name, microservice: option.microservice };
        const hanlderToken = getServiceHandlerToken(config.transport, config.microservice, config.name);
        const serviceToken = getServiceToken(config.transport, config.microservice, config.name);

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

            {
                provide: REGISTER_SERVICES,
                useFactory: (injector: Injector) => {
                    const heandler = createRequestHandler(injector, option);
                    return {
                        service: getClassRef(TcpServer).createInvocation(injector, {
                            providers: [
                                {
                                    provide: TcpHandler,
                                    useValue: heandler
                                }
                            ]
                        }),
                        bootstrap: option.bootstrap,
                        microservice: option.microservice
                    } as RegisterService
                },
                deps: [
                    Injector
                ],
                multi: true
            }
        ];

        return makeFeature(FeatureKind.Transport, providers, config) as TransportFeature;
    })
}