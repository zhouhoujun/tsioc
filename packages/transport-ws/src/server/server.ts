import { TransportContext, InternalServerExecption, Server, ListenOpts, TransportSession, Packet, MESSAGE, HYBRID_HOST } from '@tsdi/core';
import { Inject, Injectable, isNumber, isString, lang, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { ev } from '@tsdi/transport';
import { Server as SocketServer, WebSocketServer } from 'ws';
import * as net from 'net';
import * as tls from 'tls';
import { Duplex } from 'stream';
import { Subscription, finalize } from 'rxjs';
import { WS_SERV_OPTS, WsServerOpts } from './options';
import { WsEndpoint } from './endpoint';
import { WsTransportSessionFactory } from '../transport';
import { WsIncoming } from './incoming';
import { WsOutgoing } from './outgoing';
import { WsContext } from './context';


@Injectable()
export class WsServer extends Server<TransportContext> {

    private serv?: SocketServer;

    @InjectLog()
    private logger!: Logger;


    constructor(
        readonly endpoint: WsEndpoint,
        @Inject(WS_SERV_OPTS) private options: WsServerOpts) {
        super();
    }


    protected async onStartup(): Promise<any> {
        const serverOpts = {
            ...this.options.serverOpts
        };
        if (!serverOpts.server && !serverOpts.port) {
            const hostServer = this.endpoint.injector.get(HYBRID_HOST, null);
            if (hostServer && (
                hostServer instanceof net.Server
                || hostServer instanceof tls.Server
            )) {
                serverOpts.server = hostServer as any;
            } else {
                serverOpts.port = 3000;
            }
        }
        if (serverOpts.server) {
            serverOpts.server.on(ev.CLOSE, () => this.close());
        }
        this.options.serverOpts = serverOpts;
        this.serv = serverOpts?.noServer ? new WebSocketServer(serverOpts) : new SocketServer(this.options.serverOpts);
    }

    protected async onStart(): Promise<any> {
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info('WS server closed!'));
        this.serv.on(ev.ERROR, (err) => this.logger.error(err));
        const factory = this.endpoint.injector.get(WsTransportSessionFactory);
        this.serv.on(ev.CONNECTION, (socket) => {
            const session = factory.create(socket, this.options.transportOpts!);
            session.on(ev.MESSAGE, (packet) => this.requestHandler(session, packet));
        })
        if (this.options.listenOpts && this.options.serverOpts?.server) {
            this.listen(this.options.listenOpts);
        }
    }

    protected async onShutdown(): Promise<any> {
        if (this.serv) {
            await promisify(this.serv.close, this.serv)()
                .catch(err => {
                    this.logger?.error(err);
                    return err;
                });
        }
    }


    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this.options.serverOpts?.server) throw new InternalServerExecption();
        const server = this.options.serverOpts.server;
        if (server.listening) {
            return this;
        }
        const isSecure = server instanceof tls.Server;
        if (isNumber(arg1)) {
            const port = arg1;
            if (isString(arg2)) {
                const host = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { host, port };
                }
                this.logger.info(lang.getClassName(this), 'access with url:', `ws${isSecure ? 's' : ''}://${host}:${port}`, '!')
                server.listen(port, host, listeningListener);
            } else {
                listeningListener = arg2;
                if (!this.options.listenOpts) {
                    this.options.listenOpts = { port };
                }
                this.logger.info(lang.getClassName(this), 'access with url:', `ws${isSecure ? 's' : ''}://localhost:${port}`, '!')
                server.listen(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) {
                this.options.listenOpts = opts;
            }
            this.logger.info(lang.getClassName(this), 'listen:', opts, '. access with url:', `ws${isSecure ? 's' : ''}://${opts?.host ?? 'localhost'}:${opts?.port}${opts?.path ?? ''}`, '!');
            server.listen(opts, listeningListener);
        }
        return this;
    }

    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(session: TransportSession<Duplex>, packet: Packet): Subscription {
        if (!packet.method) {
            packet.method = MESSAGE;
        }
        const req = new WsIncoming(session, packet);
        const res = new WsOutgoing(session, packet.id);

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

    protected createContext(req: WsIncoming, res: WsOutgoing): WsContext {
        const injector = this.endpoint.injector;
        return new WsContext(injector, req, res, this.options);
    }


}