import { Router, MiddlewareLike, ListenOpts, ExecptionFilter } from '@tsdi/core';
import { Injectable, lang, Nullable, tokenId } from '@tsdi/ioc';
import {
    TransportExecptionHandlers, LogInterceptor, BodyparserMiddleware, ContentMiddleware, EncodeJsonMiddleware, SessionMiddleware,
    TransportServer, TransportContext, ExecptionFinalizeFilter, Connection, ConnectionOpts, PacketFactory, ev, IncomingMessage, OutgoingMessage
} from '@tsdi/transport';
import { TcpServerOpts, TCP_SERV_INTERCEPTORS } from './options';
import { TcpIncomingUtil } from '../transport';
import * as net from 'net';
import * as tls from 'tls';
import { Duplex } from 'stream';
import { HttpStatusFactory } from '@tsdi/transport-http';


/**
 * TCP Middlewares.
 */
export const TCP_MIDDLEWARES = tokenId<MiddlewareLike<TransportContext>[]>('TCP_MIDDLEWARES');
/**
 * TCP execption filters.
 */
export const TCP_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTION_FILTERS');

/**
 * tcp server default options.
 */
export const TCP_SERVER_OPTS = {
    interceptorsToken: TCP_SERV_INTERCEPTORS,
    execptionFiltersToken: TCP_EXECPTION_FILTERS,
    middlewaresToken: TCP_MIDDLEWARES,
    statusFactory: HttpStatusFactory,
    content: {
        root: 'public'
    },
    connectionOpts: {
        delimiter: '\r\n',
        maxSize: 10 * 1024 * 1024
    },
    interceptors: [
        LogInterceptor
    ],
    serverOpts: {
    },
    execptions: [
        ExecptionFinalizeFilter,
        TransportExecptionHandlers
    ],
    middlewares: [
        ContentMiddleware,
        SessionMiddleware,
        EncodeJsonMiddleware,
        BodyparserMiddleware,
        Router
    ],
    listenOpts: {
    }
} as TcpServerOpts;


/**
 * TCP server. server of `tcp` or `ipc`. 
 */
@Injectable()
export class TcpServer extends TransportServer<IncomingMessage, OutgoingMessage, net.Server | tls.Server, TcpServerOpts> {
    constructor(@Nullable() options: TcpServerOpts) {
        super(options)
    }

    protected override getDefaultOptions() {
        return TCP_SERVER_OPTS;
    }

    protected createServer(opts: TcpServerOpts): net.Server | tls.Server {
        return (opts.serverOpts as tls.TlsOptions).cert ? tls.createServer(opts.serverOpts as tls.TlsOptions) : net.createServer(opts.serverOpts as net.ServerOpts)
    }


    protected createConnection(socket: Duplex, opts?: ConnectionOpts | undefined): Connection {
        const packet = this.context.get(PacketFactory);
        return new Connection(socket, packet, opts);
    }

    protected createContext(req: IncomingMessage, res: OutgoingMessage): TransportContext<IncomingMessage, OutgoingMessage> {
        const injector = this.context.injector;
        return new TransportContext(injector, req, res, this, injector.get(TcpIncomingUtil))
    }



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

    protected listen(server: net.Server | tls.Server, opts: ListenOpts): Promise<void> {
        const defer = lang.defer<void>();
        server.listen(opts, defer.resolve);
        return defer.promise;
    }

}
