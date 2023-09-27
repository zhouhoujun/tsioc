import { EMPTY_OBJ, Inject, Injectable, lang, promisify } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { InternalServerExecption, ev, LOCALHOST, HYBRID_HOST, TransportSessionFactory } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { DuplexTransportSessionFactory, ExecptionFinalizeFilter, FinalizeFilter, LogInterceptor, MICROSERVICE_IMPL, RequestHandler, Server, defaultMaxSize } from '@tsdi/endpoints';
import { Server as SocketServer, WebSocketServer, createWebSocketStream } from 'ws';
import * as net from 'net';
import * as tls from 'tls';
import { WS_SERV_FILTERS, WS_SERV_GUARDS, WS_SERV_INTERCEPTORS, WS_SERV_OPTS, WsServerOpts } from './options';
import { WsEndpoint } from './endpoint';
import { Subscription } from 'rxjs';


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
        const injector = this.endpoint.injector;
        const factory = injector.get(TransportSessionFactory);
        this.serv.on(ev.CONNECTION, (socket) => {
            const stream = createWebSocketStream(socket);
            const session = factory.create(stream, this.options.transportOpts!);
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


    // /**
    //  * request handler.
    //  * @param observer 
    //  * @param req 
    //  * @param res 
    //  */
    // protected requestHandler(session: TransportSession, packet: RequestPacket): Subscription {
    //     if (!packet.method) {
    //         packet.method = MESSAGE;
    //     }

    //     const ctx = this.createContext(session, packet);
    //     const req = ctx.request;
    //     const cancel = this.endpoint.handle(ctx)
    //         .pipe(finalize(() => {
    //             ctx.destroy();
    //         }))
    //         .subscribe({
    //             error: (err) => {
    //                 this.logger.error(err)
    //             }
    //         });
    //     const opts = this.options;
    //     opts.timeout && req.setTimeout && req.setTimeout(opts.timeout, () => {
    //         req.emit?.(ev.TIMEOUT);
    //         cancel?.unsubscribe()
    //     });
    //     req.once?.(ev.ABOUT, () => cancel?.unsubscribe())
    //     return cancel;
    // }

}


/**
 * ws default options.
 */
const defMicroOpts = {
    transportOpts: {
        delimiter: '#',
        maxSize: defaultMaxSize
    },
    content: {
        root: 'public',
        prefix: 'content'
    },
    detailError: true,
    interceptorsToken: WS_SERV_INTERCEPTORS,
    filtersToken: WS_SERV_FILTERS,
    guardsToken: WS_SERV_GUARDS,
    sessionFactory: DuplexTransportSessionFactory,
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        FinalizeFilter
    ]

} as WsServerOpts;


MICROSERVICE_IMPL.setMicroservice('ws', {
    serverType: WsServer,
    serverOptsToken: WS_SERV_OPTS,
    endpointType: WsEndpoint,
    defaultOpts: defMicroOpts
});
