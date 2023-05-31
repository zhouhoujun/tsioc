import { Abstract, Inject, Injectable, isNumber, isString, lang, promisify } from '@tsdi/ioc';
import { Server, Outgoing, ListenOpts, InternalServerExecption, Incoming, ListenService, TransportSessionFactory, Packet, TransportSession, MicroService, MESSAGE, GET } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logs';
import { ev } from '@tsdi/transport';
import { Subscription, finalize } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TCP_SERV_OPTS, TcpServerOpts } from './options';
import { TcpContext } from './context';
import { TcpEndpoint } from './endpoint';
import { TcpIncoming } from './incoming';
import { TcpOutgoing } from './outgoing';
import { TCP_MICRO_SERV } from '../status';


/**
 * tcp micro service.
 */
@Abstract()
export abstract class TcpMicroService extends MicroService<TcpContext, Outgoing> {

}


/**
 * TCP server. server of `tcp` or `ipc`. 
 */
@Injectable()
export class TcpServer extends Server<TcpContext, Outgoing> implements MicroService<TcpContext, Outgoing>, ListenService {

    private serv!: net.Server | tls.Server;

    @InjectLog() logger!: Logger;
    private isSecure: boolean;
    private options: TcpServerOpts;

    constructor(
        readonly endpoint: TcpEndpoint,
        @Inject(TCP_MICRO_SERV) readonly micro: boolean,
        @Inject(TCP_SERV_OPTS) options: TcpServerOpts) {
        super()
        this.options = { ...options };
        this.isSecure = !!(this.options.serverOpts as tls.TlsOptions)?.cert
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
                this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
                this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://${host}:${port}`, '!')
                this.serv.listen(port, host, listeningListener);
            } else {
                listeningListener = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { port };
                }
                this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
                this.logger.info(lang.getClassName(this), 'access with url:', `http${isSecure ? 's' : ''}://localhost:${port}`, '!')
                this.serv.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) {
                this.options.listenOpts = opts;
            }
            this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
            this.logger.info(lang.getClassName(this), 'listen:', opts, '. access with url:', `http${isSecure ? 's' : ''}://${opts?.host ?? 'localhost'}:${opts?.port}${opts?.path ?? ''}`, '!');
            this.serv.listen(opts, listeningListener);
        }
        return this;
    }

    protected async onStartup(): Promise<any> {
        const opts = this.options;
        const serv = this.serv = this.isSecure ? tls.createServer(opts.serverOpts as tls.TlsOptions) : net.createServer(opts.serverOpts as net.ServerOpts);
        this.endpoint.injector.setValue(ListenOpts, this.options.listenOpts);
        return serv;
    }

    protected async onStart(): Promise<any> {
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info('Tcp server closed!'));
        this.serv.on(ev.ERROR, (err) => this.logger.error(err));
        const factory = this.endpoint.injector.get(TransportSessionFactory);
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

    protected onShutdown(): Promise<any> {
        return promisify(this.serv.close, this.serv)();
    }

    protected createServer(opts: TcpServerOpts): net.Server | tls.Server {
        const serv = this.serv = (opts.serverOpts as tls.TlsOptions).cert ? tls.createServer(opts.serverOpts as tls.TlsOptions) : net.createServer(opts.serverOpts as net.ServerOpts);
        return serv;
    }

    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(session: TransportSession<tls.TLSSocket | net.Socket>, packet: Packet): Subscription {
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
        return new TcpContext(injector, req, res, this.options.proxy);
    }

}
