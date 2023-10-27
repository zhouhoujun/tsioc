import { Inject, Injectable, isNumber, isString, lang, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { ListenOpts, ListenService, InternalServerExecption, ev, TransportSessionFactory, LOCALHOST } from '@tsdi/common';
import { BindServerEvent, RequestHandler, Server } from '@tsdi/endpoints';
import { Subscription, lastValueFrom } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TCP_SERV_OPTS, TcpServerOpts } from './options';
import { TcpEndpoint } from './endpoint';
import { ApplicationEventMulticaster } from '@tsdi/core';



/**
 * tcp server of `tcp` or `ipc`. 
 */
@Injectable()
export class TcpServer extends Server implements ListenService {

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

    protected async setup(): Promise<any> {
        const opts = this.options;
        this.serv = this.createServer(opts);

        const injector = this.endpoint.injector;
        if (!this.options.transportOpts?.microservice) {
            // notify hybrid service to bind http server.
            await lastValueFrom(injector.get(ApplicationEventMulticaster).emit(new BindServerEvent(this.serv, this)));
        }
    }

    protected async onStart(): Promise<any> {
        await this.setup();
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info('Tcp server closed!'));
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

        if (this.options.listenOpts && this.options.autoListen) {
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
