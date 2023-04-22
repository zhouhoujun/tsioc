import { Inject, Injectable, isNumber, isString, lang } from '@tsdi/ioc';
import { Server, Outgoing, ListenOpts, InternalServerExecption, Incoming } from '@tsdi/core';
import { Log, Logger } from '@tsdi/logs';
import { ev } from '@tsdi/transport';
import { Subscription, finalize } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TCP_SERV_OPTS, TcpServerOpts } from './options';
import { TcpContext } from './context';
import { TcpEndpoint } from './endpoint';




/**
 * TCP server. server of `tcp` or `ipc`. 
 */
@Injectable()
export class TcpServer extends Server<TcpContext, Outgoing> {

    private serv!: net.Server | tls.Server;

    @Log() logger!: Logger;
    private isSecure: boolean;
    private options: TcpServerOpts;
    constructor(readonly endpoint: TcpEndpoint, @Inject(TCP_SERV_OPTS, {}) options: TcpServerOpts) {
        super()
        this.options = { ...options };
        this.isSecure = !!(this.options.serverOpts as tls.TlsOptions) ?.cert
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
        // return serv;
    }

    protected async onStart(): Promise<any> {
        if (!this.serv) throw new InternalServerExecption();
        
        this.serv.on(ev.REQUEST, (req, res) => this.requestHandler(req, res));
        this.serv.on(ev.CLOSE, () => this.logger.info('Http server closed!'));
        this.serv.on(ev.ERROR, (err) => this.logger.error(err));

        if(this.options.listenOpts &&this.options.autoListen) {
            this.listen(this.options.listenOpts)
        }
    }

    protected onShutdown(): Promise<any> {
        const defer = lang.defer();
        this.serv.close(err => err ? defer.reject(err) : defer.resolve())
        return defer.promise;
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
    protected requestHandler(req: Incoming, res: Outgoing): Subscription {
        const ctx = this.createContext(req, res);
        const cancel = this.endpoint.handle(ctx)
            .pipe(finalize(() => ctx.destroy()))
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

    protected createContext(req: Incoming, res: Outgoing): TcpContext {
        const injector = this.endpoint.injector;
        return new TcpContext(injector, req, res);
    }

    // protected override async setupServe(server: net.Server | tls.Server, observer: Subscriber<net.Server | tls.Server>, opts: TcpServerOpts): Promise<Cleanup> {
    //     const clean = await super.setupServe(server, observer, opts);
    //     const onRequest = this.onRequest.bind(this);
    //     const onConnection = (socket: net.Socket | tls.TLSSocket) => {
    //         const packet = this.context.get(TcpPackFactory);
    //         const conn = new DuplexConnection(socket, packet, opts.connectionOpts);
    //         conn.on(ev.REQUEST, onRequest);
    //     }
    //     server.on(ev.CONNECTION, onConnection);
    //     return () => {
    //         server.off(ev.CONNECTION, onConnection);
    //         clean();
    //     };
    // }




    // protected override onConnection(server: net.Server | tls.Server, opts?: ConnectionOpts): Observable<Connection> {
    //     const packetor = this.context.get(Packetor);
    //     return new Observable((observer) => {
    //         const onError = (err: Error) => {
    //             observer.error(err);
    //         };
    //         const onConnection = (socket: net.Socket) => {
    //             observer.next(new Connection(socket, packetor, opts));
    //         }
    //         const onClose = () => {
    //             observer.complete();
    //         }
    //         server.on(ev.ERROR, onError);
    //         server.on(ev.CONNECTION, onConnection);
    //         server.on(ev.CLOSE, onClose)

    //         return () => {
    //             server.off(ev.ERROR, onError);
    //             server.off(ev.CLOSE, onClose);
    //             server.off(ev.CONNECTION, onConnection);
    //         }
    //     })
    // }



    // protected onRequest(conn: Connection, endpoint: Endpoint): Observable<any> {
    //     return new Observable((observer) => {
    //         const subs: Set<Subscription> = new Set();
    //         const injector = this.context.injector;
    //         const onRequest = (req: ServerRequest, res: ServerResponse) => {
    //             const ctx = new TransportContext(injector, req, res, this, injector.get(IncomingUtil));
    //             const sub = endpoint.handle(req, ctx)
    //                 .pipe(finalize(() => ctx.destroy()))
    //                 .subscribe({
    //                     next: (val) => observer.next(val),
    //                     // error: (err)=> observer.error(err),
    //                     complete: () => {
    //                         subs.delete(sub);
    //                         if (!subs.size) {
    //                             observer.complete();
    //                         }
    //                     }
    //                 });
    //             const opts = ctx.target.getOptions();
    //             opts.timeout && req.setTimeout(opts.timeout, () => {
    //                 req.emit(ev.TIMEOUT);
    //                 sub?.unsubscribe()
    //             });
    //             req.once(ev.CLOSE, async () => {
    //                 await lang.delay(500);
    //                 sub?.unsubscribe();
    //                 if (!ctx.sent) {
    //                     ctx.response.end()
    //                 }
    //             });
    //             subs.add(sub);
    //         };

    //         conn.on(ev.REQUEST, onRequest);
    //         return () => {
    //             subs.forEach(s => {
    //                 s && s.unsubscribe();
    //             });
    //             subs.clear();
    //             conn.off(ev.REQUEST, onRequest);
    //         }
    //     });
    // }

}
