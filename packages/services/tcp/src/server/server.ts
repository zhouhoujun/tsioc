import { ArgumentExecption, Inject, Injectable, ProvdierOf, isFunction, isNumber, isString, lang, promisify } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { ListenOpts, ListenService, InternalServerExecption, ev, TransportSessionFactory } from '@tsdi/common/transport';
import { BindServerEvent, MiddlewareEndpoint, MiddlewareLike, MiddlewareService, RequestHandler, Server } from '@tsdi/endpoints';
import { Subscription, lastValueFrom } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TCP_BIND_FILTERS, TCP_BIND_GUARDS, TCP_BIND_INTERCEPTORS, TCP_SERV_OPTS, TcpServerOpts } from './options';
import { TcpEndpoint } from './endpoint';
import { LOCALHOST } from '@tsdi/common';



/**
 * tcp server of `tcp` or `ipc`. 
 */
@Injectable()
export class TcpServer extends Server implements ListenService, MiddlewareService {

    protected serv?: net.Server | tls.Server | null;

    @InjectLog() logger!: Logger;

    protected isSecure: boolean;

    private subs: Subscription;

    constructor(
        readonly endpoint: TcpEndpoint,
        @Inject(TCP_SERV_OPTS) private options: TcpServerOpts,
    ) {
        super();

        this.subs = new Subscription();
        this.isSecure = !!(this.options.serverOpts as tls.TlsOptions)?.cert;
    }

    use(middlewares: ProvdierOf<MiddlewareLike> | ProvdierOf<MiddlewareLike>[], order?: number | undefined): this {
        const endpoint = this.endpoint as MiddlewareEndpoint;
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
        const isSecure = this.options.secure = this.isSecure;
        const protocol = this.options.protocol = this.options.protocol ?? (isSecure ? 'ssl' : 'tcp');
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                const host = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { host, port };
                }
                this.logger.info(lang.getClassName(this), 'access with url:', `${protocol}://${host}:${port}`, '!')
                this.serv.listen(port, host, listeningListener);
            } else {
                listeningListener = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { host: LOCALHOST, port };
                }
                this.logger.info(lang.getClassName(this), 'access with url:', `${protocol}://localhost:${port}`, '!')
                this.serv.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) {
                this.options.listenOpts = opts;
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
        if (this.serv || (isString(this.options.heybird) && event.transport !== this.options.heybird)) return;
        await this.onStart(event.server);
    }

    protected async setup(): Promise<any> {
        const opts = this.options;
        this.serv = this.createServer(opts);
    }

    protected async onStart(bindServer?: any): Promise<any> {
        if (this.options.heybird && !bindServer) return;

        if (!bindServer) {
            await this.setup();
        }
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info(this.options.transportOpts?.microservice ? 'Tcp microservice closed!' : 'Tcp server closed!'));
        this.serv.on(ev.ERROR, (err) => this.logger.error(err));
        const injector = this.endpoint.injector;
        const factory = injector.get(TransportSessionFactory);
        const transportOpts = this.options.transportOpts!;
        if (!transportOpts.serverSide) transportOpts.serverSide = true;
        if (!transportOpts.transport) transportOpts.transport = 'tcp';

        if (this.serv instanceof tls.Server) {
            this.serv.on(ev.SECURE_CONNECTION, (socket) => {
                const session = factory.create(socket, transportOpts);
                this.subs.add(injector.get(RequestHandler).handle(this.endpoint, session, this.logger, this.options));
            })
        } else {
            this.serv.on(ev.CONNECTION, (socket) => {
                const session = factory.create(socket, transportOpts);
                this.subs.add(injector.get(RequestHandler).handle(this.endpoint, session, this.logger, this.options));
            })
        }

        if (!this.options.transportOpts?.microservice && !bindServer) {
            // notify hybrid service to bind http server.
            await lastValueFrom(injector.get(ApplicationEventMulticaster).emit(new BindServerEvent(this.serv, 'tcp', this)));
        }

        if (this.options.listenOpts && !bindServer) {
            this.listen(this.options.listenOpts)
        }
    }

    protected async onShutdown(): Promise<any> {
        if (!this.serv) return;
        this.subs?.unsubscribe();
        // if (!this.micro) this.endpoint.injector.get(ModuleRef).unregister(HYBRID_HOST);
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
