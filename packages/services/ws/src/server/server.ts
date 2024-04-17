import { EMPTY_OBJ, Inject, Injectable, getClassName, isString, lang, promisify } from '@tsdi/ioc';
import { EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { LOCALHOST } from '@tsdi/common';
import { InternalServerExecption, ev } from '@tsdi/common/transport';
import { BindServerEvent, RequestContext, Server, TransportSessionFactory } from '@tsdi/endpoints';
import { Server as SocketServer, WebSocketServer, createWebSocketStream } from 'ws';
import { Subject, Subscription, first, fromEvent, merge } from 'rxjs';
import * as tls from 'tls';
import { WS_BIND_FILTERS, WS_BIND_GUARDS, WS_BIND_INTERCEPTORS, WsServerOpts } from './options';
import { WsEndpointHandler } from './handler';


/**
 * ws server.
 */
@Injectable()
export class WsServer extends Server<RequestContext, WsServerOpts> {

    private serv?: SocketServer | null;

    @InjectLog()
    private logger!: Logger;

    private destroy$: Subject<void>;

    constructor(readonly handler: WsEndpointHandler) {
        super();
        this.destroy$ = new Subject();
    }

    @EventHandler(BindServerEvent, {
        interceptorsToken: WS_BIND_INTERCEPTORS,
        filtersToken: WS_BIND_FILTERS,
        globalGuardsToken: WS_BIND_GUARDS
    })
    async bind(event: BindServerEvent<any>) {
        const options = this.getOptions();
        if (this.serv || (isString(options.heybird) && event.transport !== options.heybird)) return;
        await this.onStart(event.server);
    }

    protected async setup(bindServer?: any): Promise<any> {
        const serverOpts = {
            ...this.getOptions().serverOpts
        };
        if (bindServer) {
            serverOpts.server = bindServer;
        } else if (!serverOpts.server && !serverOpts.port) {
            serverOpts.port = 3000;
        }
        this.serv = serverOpts.noServer || serverOpts.server ? new WebSocketServer(serverOpts) : new SocketServer(serverOpts);
    }

    protected async onStart(bindServer?: any): Promise<any> {
        const options = this.getOptions();
        if (options.heybird && !bindServer) return;
        await this.setup(bindServer);
        if (!this.serv) throw new InternalServerExecption();

        this.serv.on(ev.CLOSE, () => this.logger.info('WS microservice closed!'));
        this.serv.on(ev.ERROR, (err) => {
            this.logger.error(err);
        });
        const injector = this.handler.injector;
        const factory = injector.get(TransportSessionFactory);
        const { server, noServer, port, host } = options.serverOpts ?? EMPTY_OBJ;
        const isSecure = server instanceof tls.Server;
        if (options.protocol) {
            options.protocol = isSecure ? 'wss' : 'ws';
        }

        this.serv.on(ev.CONNECTION, (socket) => {
            const stream = createWebSocketStream(socket);
            const transportOpts = options.transportOpts!;
            const session = factory.create(injector, stream, transportOpts!);            
            session.listen(this.handler, merge(this.destroy$, fromEvent(socket, ev.CLOSE), fromEvent(socket, ev.DISCONNECT)).pipe(first()));
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
        this.destroy$.next();
        this.destroy$.complete();
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
