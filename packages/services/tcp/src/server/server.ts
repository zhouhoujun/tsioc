import { ArgumentExecption, Inject, Injectable, ProvdierOf, isFunction, isNumber, isString, lang, promisify } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { LOCALHOST, ListenOpts, ListenService } from '@tsdi/common';
import { InternalServerExecption, ev } from '@tsdi/common/transport';
import { BindServerEvent, MiddlewareHandler, MiddlewareLike, MiddlewareService, RequestContext, Server, TransportSessionFactory } from '@tsdi/endpoints';
import { Subject, first, fromEvent, lastValueFrom, merge } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TCP_BIND_FILTERS, TCP_BIND_GUARDS, TCP_BIND_INTERCEPTORS, TcpServerOpts } from './options';
import { TcpEndpointHandler } from './handler';



/**
 * tcp server of `tcp` or `ipc`. 
 */
@Injectable()
export class TcpServer extends Server<RequestContext, TcpServerOpts> implements ListenService, MiddlewareService {

    protected serv?: net.Server | tls.Server | null;

    @InjectLog() logger!: Logger;

    protected isSecure: boolean;

    private destroy$: Subject<void>;

    constructor(
        readonly handler: TcpEndpointHandler,
    ) {
        super();

        this.destroy$ = new Subject();
        this.isSecure = !!(this.getOptions().serverOpts as tls.TlsOptions)?.cert;
    }

    use(middlewares: ProvdierOf<MiddlewareLike> | ProvdierOf<MiddlewareLike>[], order?: number | undefined): this {
        const endpoint = this.handler as MiddlewareHandler;
        if (isFunction(endpoint.use)) {
            endpoint.use(middlewares, order);
        } else {
            throw new ArgumentExecption('Not support middlewares');
        }
        return this;
    }

    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this.serv) throw new InternalServerExecption();
        const options = this.getOptions();
        const isSecure = options.secure = this.isSecure;
        const protocol = options.protocol = options.protocol ?? (isSecure ? 'ssl' : 'tcp');
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                const host = arg2;
                if (!options.listenOpts) {
                    options.listenOpts = { host, port };
                }
                this.logger.info(lang.getClassName(this), 'access with url:', `${protocol}://${host}:${port}`, '!')
                this.serv.listen(port, host, listeningListener);
            } else {
                listeningListener = arg2;
                if (!options.listenOpts) {
                    options.listenOpts = { host: LOCALHOST, port };
                }
                this.logger.info(lang.getClassName(this), 'access with url:', `${protocol}://localhost:${port}`, '!')
                this.serv.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!options.listenOpts) {
                options.listenOpts = opts;
            }
            if (opts.host || opts.port) {
                this.logger.info(lang.getClassName(this), 'listen:', opts, '. access with url:', `${protocol}://${opts?.host ?? 'localhost'}:${opts?.port}${opts?.path ?? ''}`, '!');
            } else {
                this.logger.info(lang.getClassName(this), 'listen:', opts, '. access with IPC address:', opts.path, '!');
            }
            this.serv.listen(opts, listeningListener);
        }
        return this;
    }

    @EventHandler(BindServerEvent, {
        interceptorsToken: TCP_BIND_INTERCEPTORS,
        filtersToken: TCP_BIND_FILTERS,
        globalGuardsToken: TCP_BIND_GUARDS
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

        if (!bindServer) {
            await this.setup();
        }
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info(options.microservice ? 'Tcp microservice closed!' : 'Tcp server closed!'));
        this.serv.on(ev.ERROR, (err) => this.logger.error(err));
        const injector = this.handler.injector;
        const factory = injector.get(TransportSessionFactory);
        const transportOpts = options.transportOpts!;
        if (!transportOpts.transport) transportOpts.transport = 'tcp';

        if (this.serv instanceof tls.Server) {
            this.serv.on(ev.SECURE_CONNECTION, (socket) => {
                const session = factory.create(injector, socket, transportOpts);
                session.listen(this.handler, merge(this.destroy$, fromEvent(socket, ev.CLOSE), fromEvent(socket, ev.DISCONNECT)).pipe(first()));
            })
        } else {
            this.serv.on(ev.CONNECTION, (socket) => {
                const session = factory.create(injector, socket, transportOpts);
                session.listen(this.handler, merge(this.destroy$, fromEvent(socket, ev.CLOSE), fromEvent(socket, ev.DISCONNECT)).pipe(first()));
                // session.receive().pipe(
                //     takeUntil(this.destroy$),
                //     mergeMap(request => this.handler.handle(request))
                // ).subscribe()
            })
        }

        if (!options.microservice && !bindServer) {
            // notify hybrid service to bind http server.
            await lastValueFrom(injector.get(ApplicationEventMulticaster).emit(new BindServerEvent(this.serv, 'tcp', this)));
        }

        if (options.listenOpts && !bindServer) {
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

    protected createServer(opts: TcpServerOpts): net.Server | tls.Server {
        return this.isSecure ? tls.createServer(opts.serverOpts as tls.TlsOptions) : net.createServer(opts.serverOpts as net.ServerOpts);
    }

}
