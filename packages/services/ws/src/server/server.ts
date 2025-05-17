import { Injectable, getTypeName, isString, promisify } from '@tsdi/ioc';
import { EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { LOCALHOST } from '@tsdi/common';
import { InternalServerException, ev } from '@tsdi/common/transport';
import { BindServerEvent, RequestContext, Server, ServerTransportFactory } from '@tsdi/endpoints';
import { WebSocketServer, createWebSocketStream } from 'ws';
import { Subject, finalize, first, fromEvent, merge } from 'rxjs';
import * as tls from 'tls';
import { WS_BIND_FILTERS, WS_BIND_GUARDS, WS_BIND_INTERCEPTORS, WsServConfig } from './options';
import { WsRequestHandler } from './handler';


/**
 * ws server.
 */
@Injectable()
export class WsServer extends Server<RequestContext, WsServConfig> {

    private serv?: WebSocketServer | null;

    @InjectLog()
    private logger!: Logger;

    private destroy$: Subject<void>;

    constructor(readonly handler: WsRequestHandler) {
        super();
        this.destroy$ = new Subject();
    }

    @EventHandler(BindServerEvent, {
        interceptorsToken: WS_BIND_INTERCEPTORS,
        filtersToken: WS_BIND_FILTERS,
        guardsToken: WS_BIND_GUARDS
    })
    async bind(event: BindServerEvent<any>) {
        const options = this.getOptions();
        if (this.serv || (isString(options.heybird) && event.transport !== options.heybird)) return;
        await this.onStart(event.server);
    }

    protected async setup(bindServer?: any): Promise<any> {
        const options = this.getOptions();
        if (!options.serverOpts) {
            options.serverOpts = {};
        }
        const serverOpts = options.serverOpts;
        if (bindServer) {
            serverOpts.server = bindServer;
        } else if (!serverOpts.server && !serverOpts.port) {
            serverOpts.port = 3000;
        }
        this.serv = new WebSocketServer(serverOpts);

    }

    protected async onStart(bindServer?: any): Promise<any> {
        const options = this.getOptions();
        if (options.heybird && !bindServer) return;
        await this.setup(bindServer);
        if (!this.serv) throw new InternalServerException();

        this.serv.on(ev.CLOSE, () => this.logger.info('WS microservice closed!'));
        this.serv.on(ev.ERROR, (err) => {
            this.logger.error(err);
        });
        const injector = this.handler.injector;
        const factory = injector.get(ServerTransportFactory);
        const { server, noServer, port, host } = options.serverOpts ?? {};
        const isSecure = server instanceof tls.Server;
        if (options.protocol) {
            options.protocol = isSecure ? 'wss' : 'ws';
        }

        this.serv.on(ev.CONNECTION, (socket) => {
            const stream = options.enableStream ? createWebSocketStream(socket) : socket;
            const trasnport = factory.create(injector, stream, options);
            trasnport.handle(this.handler, merge(this.destroy$, fromEvent(socket, ev.CLOSE)).pipe(
                first()
            ));
        });


        if (port && !bindServer) {
            this.logger.info(getTypeName(this), 'access with url:', `ws${isSecure ? 's' : ''}://${host ?? LOCALHOST}:${port}`, '!');
        } else {
            this.logger.info(getTypeName(this), 'hybrid bind with', getTypeName(bindServer ?? server));
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
