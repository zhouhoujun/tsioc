import { EMPTY_OBJ, Inject, Injectable, lang, promisify } from '@tsdi/ioc';
import { Packet, MESSAGE, InternalServerExecption, TransportSession, TransportSessionFactory, ev, LOCALHOST, HYBRID_HOST } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { Server, TransportContext } from '@tsdi/endpoints';
import { Server as SocketServer, WebSocketServer, createWebSocketStream } from 'ws';
import * as net from 'net';
import * as tls from 'tls';
import { Subscription, finalize } from 'rxjs';
import { WS_SERV_OPTS, WsServerOpts } from './options';
import { WsEndpoint } from './endpoint';
import { WsTransportSession, WsTransportSessionFactory } from '../factory';
import { WsIncoming } from './incoming';
import { WsOutgoing } from './outgoing';
import { WsContext } from './context';


@Injectable()
export class WsServer extends Server<TransportContext> {

    private serv?: SocketServer | null;

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
        this.serv = serverOpts?.noServer ? new WebSocketServer(serverOpts) : new SocketServer(serverOpts);
    }

    protected async onStart(): Promise<any> {
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info('WS server closed!'));
        this.serv.on(ev.ERROR, (err) => {
            this.logger.error(err);
        });
        const factory = this.endpoint.injector.get(TransportSessionFactory);
        this.serv.on(ev.CONNECTION, (socket) => {
            const stream = createWebSocketStream(socket);
            const session = factory.create(stream, this.options.transportOpts!);
            session.receiver.packet.subscribe(p=> this.requestHandler(session, p));
        })

        const { server, noServer, port, host } = this.options.serverOpts ?? EMPTY_OBJ;
        const isSecure = server instanceof tls.Server;
        if (port) {
            this.logger.info(lang.getClassName(this), 'access with url:', `ws${isSecure ? 's' : ''}://${host ?? LOCALHOST}:${port}`, '!');
        } else {
            this.logger.info(lang.getClassName(this), 'hybrid bind with', server);
        }
    }

    protected async onShutdown(): Promise<any> {
        if (!this.serv) return;

        await promisify(this.serv.close, this.serv)()
            .catch(err => {
                this.logger?.error(err);
                return err;
            })
            .finally(() => {
                this.serv?.removeAllListeners();
                this.serv = null;
            });

    }


    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(session: TransportSession, packet: Packet): Subscription {
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