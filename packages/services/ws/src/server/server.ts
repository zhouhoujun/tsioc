import { EMPTY_OBJ, Inject, Injectable, getClassName, isString, lang, promisify } from '@tsdi/ioc';
import { EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { LOCALHOST } from '@tsdi/common';
import { InternalServerExecption, ev } from '@tsdi/common/transport';
import { BindServerEvent, Server, ServerTransportSessionFactory } from '@tsdi/endpoints';
import { Server as SocketServer, WebSocketServer, createWebSocketStream } from 'ws';
import { Subscription, first, fromEvent, merge } from 'rxjs';
import * as tls from 'tls';
import { WS_BIND_FILTERS, WS_BIND_GUARDS, WS_BIND_INTERCEPTORS, WS_SERV_OPTS, WsServerOpts } from './options';
import { WsEndpointHandler } from './handler';


/**
 * ws server.
 */
@Injectable()
export class WsServer extends Server {

    private serv?: SocketServer | null;

    @InjectLog()
    private logger!: Logger;

    private subs: Subscription;

    constructor(
        readonly handler: WsEndpointHandler,
        @Inject(WS_SERV_OPTS) private options: WsServerOpts) {
        super();

        this.subs = new Subscription();
    }

    @EventHandler(BindServerEvent, {
        interceptorsToken: WS_BIND_INTERCEPTORS,
        filtersToken: WS_BIND_FILTERS,
        globalGuardsToken: WS_BIND_GUARDS
    })
    async bind(event: BindServerEvent<any>) {
        if (this.serv || (isString(this.options.heybird) && event.transport !== this.options.heybird)) return;
        await this.onStart(event.server);
    }

    protected async setup(bindServer?: any): Promise<any> {
        const serverOpts = {
            ...this.options.serverOpts
        };
        if (bindServer) {
            serverOpts.server = bindServer;
        } else if (!serverOpts.server && !serverOpts.port) {
            serverOpts.port = 3000;
        }
        this.serv = serverOpts.noServer || serverOpts.server ? new WebSocketServer(serverOpts) : new SocketServer(serverOpts);
    }

    protected async onStart(bindServer?: any): Promise<any> {
        if (this.options.heybird && !bindServer) return;
        await this.setup(bindServer);
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info('WS microservice closed!'));
        this.serv.on(ev.ERROR, (err) => {
            this.logger.error(err);
        });
        const injector = this.handler.injector;
        const factory = injector.get(ServerTransportSessionFactory);
        const { server, noServer, port, host } = this.options.serverOpts ?? EMPTY_OBJ;
        const isSecure = server instanceof tls.Server;
        if (this.options.protocol) {
            this.options.protocol = isSecure ? 'wss' : 'ws';
        }

        this.serv.on(ev.CONNECTION, (socket) => {
            const stream = createWebSocketStream(socket);
            const transportOpts = this.options.transportOpts!;
            if (!transportOpts.transport) transportOpts.transport = 'ws';
            if (!transportOpts.serverSide) transportOpts.serverSide = true;
            const session = factory.create(stream, transportOpts!);            
            session.listen(this.handler, merge(fromEvent(socket, ev.CLOSE), fromEvent(socket, ev.DISCONNECT)).pipe(first()));
            // this.subs.add(injector.get(RequestHandler).handle(this.handler, session, this.logger, this.options));
        })


        if (port && !bindServer) {
            this.logger.info(lang.getClassName(this), 'access with url:', `ws${isSecure ? 's' : ''}://${host ?? LOCALHOST}:${port}`, '!');
        } else {
            this.logger.info(lang.getClassName(this), 'hybrid bind with', getClassName(bindServer ?? server));
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
