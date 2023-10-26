import { EMPTY_OBJ, Inject, Injectable, lang, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { InternalServerExecption, ev, LOCALHOST, TransportSessionFactory } from '@tsdi/common';
import { BindServerEvent, RequestHandler, Server } from '@tsdi/endpoints';
import { Server as SocketServer, WebSocketServer, createWebSocketStream } from 'ws';
import { Subscription } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { WS_SERV_OPTS, WsServerOpts } from './options';
import { WsEndpoint } from './endpoint';
import { EventHandler } from '@tsdi/core';


@Injectable()
export class WsServer extends Server {

    private serv?: SocketServer | null;

    @InjectLog()
    private logger!: Logger;

    private subs: Subscription;

    constructor(
        readonly endpoint: WsEndpoint,
        @Inject(WS_SERV_OPTS) private options: WsServerOpts) {
        super();

        this.subs = new Subscription();
    }

    @EventHandler(BindServerEvent)
    async bind(event: BindServerEvent<any>) {
        if (this.serv) return;
        await this.onStart(event.server);
    }

    protected async setup(server?: any): Promise<any> {
        const serverOpts = {
            ...this.options.serverOpts
        };
        if (serverOpts.noServer) return;
        if (server) {
            serverOpts.server = server;
        } else if (!serverOpts.server && !serverOpts.port) {
            serverOpts.port = 3000;
        }
        this.serv = serverOpts?.noServer ? new WebSocketServer(serverOpts) : new SocketServer(serverOpts);
    }

    protected async onStart(bindServer?: any): Promise<any> {
        await this.setup(bindServer);
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info('WS server closed!'));
        this.serv.on(ev.ERROR, (err) => {
            this.logger.error(err);
        });
        const injector = this.endpoint.injector;
        const factory = injector.get(TransportSessionFactory);
        this.serv.on(ev.CONNECTION, (socket) => {
            const stream = createWebSocketStream(socket);
            const transportOpts = this.options.transportOpts!;
            if (!transportOpts.transport) transportOpts.transport = 'ws';
            if (!transportOpts.serverSide) transportOpts.serverSide = true;
            const session = factory.create(stream, transportOpts!);
            this.subs.add(injector.get(RequestHandler).handle(this.endpoint, session, this.logger, this.options));
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
        this.subs?.unsubscribe();
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

}
