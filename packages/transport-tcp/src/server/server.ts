import { Inject, Injectable, ModuleRef, isNumber, isString, lang, promisify } from '@tsdi/ioc';
import { Outgoing, ListenOpts, InternalServerExecption, ListenService, Packet, Server, MESSAGE, GET, HYBRID_HOST } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logs';
import { ev } from '@tsdi/transport';
import { Subscription, finalize } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TCP_MICRO_SERV_OPTS, TCP_SERV_OPTS, TcpServerOpts } from './options';
import { TcpContext } from './context';
import { TcpEndpoint, TcpMicroEndpoint } from './endpoint';
import { TcpIncoming } from './incoming';
import { TcpOutgoing } from './outgoing';
import { TcpTransportSession, TcpTransportSessionFactory } from '../transport';



/**
 * tcp micro server of `tcp` or `ipc`. 
 */
@Injectable()
export class TcpMicroService extends Server<TcpContext, Outgoing> implements ListenService {

    protected serv?: net.Server | tls.Server | null;

    @InjectLog() logger!: Logger;
    protected isSecure: boolean;
    protected options: TcpServerOpts;
    protected micro;
    constructor(
        readonly endpoint: TcpMicroEndpoint,
        @Inject(TCP_MICRO_SERV_OPTS) options: TcpServerOpts,
    ) {
        super()
        this.options = { ...options };
        this.micro = (options as any).micro
        this.isSecure = !!(this.options.serverOpts as tls.TlsOptions)?.cert;
    }

    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this.serv) throw new InternalServerExecption();
        const isSecure = this.isSecure;
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                const host = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { host, port };
                }
                this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://${host}:${port}`, '!')
                this.serv.listen(port, host, listeningListener);
            } else {
                listeningListener = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { port };
                }
                this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://localhost:${port}`, '!')
                this.serv.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) {
                this.options.listenOpts = opts;
            }
            this.logger.info(lang.getClassName(this), 'listen:', opts, '. access with url:', `http${isSecure ? 's' : ''}://${opts?.host ?? 'localhost'}:${opts?.port}${opts?.path ?? ''}`, '!');
            this.serv.listen(opts, listeningListener);
        }
        return this;
    }

    protected async onStartup(): Promise<any> {
        const opts = this.options;
        this.serv = this.createServer(opts);
    }

    protected async onStart(): Promise<any> {
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info('Tcp server closed!'));
        this.serv.on(ev.ERROR, (err) => this.logger.error(err));
        const factory = this.endpoint.injector.get(TcpTransportSessionFactory);
        if (this.serv instanceof tls.Server) {
            this.serv.on(ev.SECURE_CONNECTION, (socket) => {
                const session = factory.create(socket, this.options.transportOpts);
                session.on(ev.MESSAGE, (packet) => this.requestHandler(session, packet));
            })
        } else {
            this.serv.on(ev.CONNECTION, (socket) => {
                const session = factory.create(socket, this.options.transportOpts);
                session.on(ev.MESSAGE, (packet) => this.requestHandler(session, packet));
            })
        }

        if (this.options.listenOpts && this.options.autoListen) {
            this.listen(this.options.listenOpts)
        }
    }

    protected async onShutdown(): Promise<any> {
        if (!this.serv) return;
        if (!this.micro) this.endpoint.injector.get(ModuleRef).unregister(HYBRID_HOST);
        await promisify(this.serv.close, this.serv)()
            .finally(() => {
                this.serv?.removeAllListeners();
                this.serv = null;
            });

    }

    protected createServer(opts: TcpServerOpts): net.Server | tls.Server {
        return this.isSecure ? tls.createServer(opts.serverOpts as tls.TlsOptions) : net.createServer(opts.serverOpts as net.ServerOpts);
    }

    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(session: TcpTransportSession, packet: Packet): Subscription {
        if (!packet.method) {
            packet.method = this.micro ? MESSAGE : GET;
        }
        const req = new TcpIncoming(session, packet);
        const res = new TcpOutgoing(session, packet.id);

        const ctx = this.createContext(req, res);
        const cancel = this.endpoint.handle(ctx)
            .pipe(finalize(() => {
                ctx.destroy();
            }))
            .subscribe({
                error: (err) => {
                    this.logger.error(err)
                }
            });
        const opts = this.options;
        opts.timeout && req.setTimeout && req.setTimeout(opts.timeout, () => {
            req.emit?.(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }

    protected createContext(req: TcpIncoming, res: TcpOutgoing): TcpContext {
        const injector = this.endpoint.injector;
        return new TcpContext(injector, req, res, this.options);
    }

}


/**
 * tcp server of `tcp` or `ipc`. 
 */
@Injectable()
export class TcpServer extends TcpMicroService {

    constructor(
        endpoint: TcpEndpoint,
        @Inject(TCP_SERV_OPTS) options: TcpServerOpts) {
        super(endpoint, options);
    }


    protected async onStartup(): Promise<any> {
        const opts = this.options;
        this.serv = this.createServer(opts);
        this.endpoint.injector.get(ModuleRef).setValue(HYBRID_HOST, this.serv);
    }

}