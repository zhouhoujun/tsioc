import {
    InOutInterceptorFilter, Incoming, ListenOpts, ModuleRef, Outgoing,
    Receiver, Router, Server, StatusInterceptorFilter, CatchInterceptor
} from '@tsdi/core';
import { Abstract, Destroyable, isBoolean, isFunction, lang } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { mergeMap, Observable } from 'rxjs';
import { LogInterceptor } from '../interceptors';
import { TransportContext, SERVER_MIDDLEWARES } from './context';
import { BodyparserMiddleware, ContentMiddleware, ContentOptions, EncodeJsonMiddleware, SessionMiddleware } from '../middlewares';
import { MimeDb } from '../mime';
import { db } from '../impl/mimedb';
import { ExecptionFinalizeFilter } from './finalize-filter';
import { TransportServerOpts, SERVER_INTERCEPTORS, SERVER_EXECPTION_FILTERS } from './options';
import { TRANSPORT_SERVR_PROVIDERS } from './providers';
import { Connection, ConnectionOpts } from '../connection';
import { ServerInterceptorFinalizeFilter } from './respond';




const defOpts = {
    sizeLimit: 10 * 1024 * 1024,
    interceptorsToken: SERVER_INTERCEPTORS,
    middlewaresToken: SERVER_MIDDLEWARES,
    filtersToken: SERVER_EXECPTION_FILTERS,
    // transport: TransportStrategy,
    content: {
        root: 'public'
    },
    mimeDb: db,
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        InOutInterceptorFilter,
        StatusInterceptorFilter,
        ServerInterceptorFinalizeFilter,
    ],
    filters: [
        ExecptionFinalizeFilter
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
} as TransportServerOpts;


/**
 * Transport Server
 */
@Abstract()
export abstract class TransportServer<T extends EventEmitter = any, TOpts extends TransportServerOpts = TransportServerOpts> extends Server<Incoming, Outgoing, TransportContext, TOpts> {

    private _server: T | null = null;
    constructor(options: TOpts) {
        super(options)
    }

    get server(): T | null {
        return this._server;
    }

    async start(): Promise<void> {
        try {
            const opts = this.getOptions();
            const server = this._server = this.createServer(opts);
            const logger = this.logger;
            const sub = this.onConnection(server, opts.connectionOpts)
                .pipe(mergeMap(conn => this.context.get(Receiver).receive(conn, this.endpoint)))
                .subscribe({
                    error: (err) => {
                        logger.error(err);
                    },
                    complete: () => {
                        logger.error('server shutdown');
                    }
                });
            this.context.onDestroy(() => sub?.unsubscribe())
            await this.listen(server, opts.listenOpts);
        } catch (err) {
            this.logger.error(err);
        }
    }

    /**
     * create server.
     * @param opts 
     */
    protected abstract createServer(opts: TOpts): T;
    /**
     * listen
     * @param server 
     * @param opts 
     */
    protected abstract listen(server: T, opts: ListenOpts): Promise<void>;

    /**
     * on connection.
     * 
     * ### Example
     * 
     * ```typescript
     * protected override onConnection(server: net.Server | tls.Server, opts?: ConnectionOpts): Observable<Connection> {
     *   const packetor = this.context.get(Packetor);
     *   return new Observable((observer) => {
     *       const onError = (err: Error) => {
     *           observer.error(err);
     *       };
     *       const onConnection = (socket: net.Socket) => {
     *           observer.next(new Connection(socket, packetor, opts));
     *       }
     *       const onClose = () => {
     *           observer.complete();
     *       }
     *       server.on(ev.ERROR, onError);
     *       server.on(ev.CONNECTION, onConnection);
     *       server.on(ev.CLOSE, onClose)
     *
     *       return () => {
     *           server.off(ev.ERROR, onError);
     *           server.off(ev.CLOSE, onClose);
     *           server.off(ev.CONNECTION, onConnection);
     *       }
     *   })
     * }
     * 
     * ```
     * 
     * @param server 
     * @param opts 
     */
    protected abstract onConnection(server: T, opts?: ConnectionOpts): Observable<Connection>;


    // protected parseToDuplex(target: any, ...args: any[]): Duplex {
    //     throw new Execption('parse connection client to Duplex not implemented.')
    // }

    // protected abstract createConnection(duplex: Duplex, opts?: ConnectionOpts): Connection;


    // protected onRequest(conn: Connection): Observable<any> {

    //     return new Observable((observer) => {
    //         const subs: Set<Subscription> = new Set();

    //         const onHeaders = (headers: IncomingHeaders, id: number) => {
    //             const sid = conn.getNextStreamId(id);
    //             const stream = this.createStream(conn, sid, headers);
    //             conn.emit(ev.STREAM, stream, headers);
    //         };


    //         const onStream = (stream: ServerStream, headers: IncomingHeaders) => {
    //             const ctx = this.buildContext(stream, headers);
    //             subs.add(this.handle(ctx, this.endpoint(), observer));
    //         };

    //         conn.on(ev.HEADERS, onHeaders);
    //         conn.on(ev.STREAM, onStream);
    //         return () => {
    //             subs.forEach(s => {
    //                 s && s.unsubscribe();
    //             });
    //             subs.clear();
    //             conn.off(ev.HEADERS, onHeaders);
    //             conn.off(ev.STREAM, onStream);
    //         }
    //     });
    // }

    // /**
    //  * 
    //  * handle request.
    //  * @param context 
    //  * @param endpoint 
    //  */
    // protected handle(ctx: TransportContext, endpoint: Endpoint, subscriber: Subscriber<TransportEvent>): Subscription {
    //     const req = ctx.request;
    //     const cancel = endpoint.handle(req, ctx)
    //         .pipe(finalize(() => ctx.destroy))
    //         .subscribe(subscriber);
    //     const opts = ctx.target.getOptions() as TransportServerOpts;
    //     opts.timeout && req.setTimeout(opts.timeout, () => {
    //         req.emit(ev.TIMEOUT);
    //         cancel?.unsubscribe()
    //     });
    //     req.once(ev.CLOSE, async () => {
    //         await lang.delay(500);
    //         cancel?.unsubscribe();
    //         if (!ctx.sent) {
    //             ctx.response.end()
    //         }
    //     });
    //     return cancel;
    // }

    // protected buildContext(stream: ServerStream, headers: IncomingHeaders): TransportContext {
    //     const request = new ServerRequest(stream, headers);
    //     const response = new ServerResponse(stream, headers);
    //     const parent = this.context;
    //     return new TransportContext(parent.injector, request, response, this, { parent });
    // }


    async close(): Promise<void> {
        const server = this.server as any as Closeable & Destroyable
        if (isFunction(server?.close)) {
            const defer = lang.defer();
            server.close((err) => {
                if (err) {
                    this.logger.error(err);
                    defer.reject(err)
                } else {
                    this.logger.info(lang.getClassName(this), this.getOptions().listenOpts, 'closed !');
                    defer.resolve()
                }
            });
            await defer.promise;
            this._server = null;
        } else if (isFunction(server?.destroy)) {
            server.destroy();
        }
    }

    protected getDefaultOptions() {
        return defOpts;
    }

    protected override initOption(options: TOpts): TOpts {
        const defOpts = this.getDefaultOptions();
        const listenOpts = { ...defOpts.listenOpts, ...options?.listenOpts };
        const connectionOpts = { objectMode: true, ...defOpts.connectionOpts, ...options?.connectionOpts };
        const providers = options && options.providers ? [...this.defaultProviders(), ...options.providers] : this.defaultProviders();
        const opts = { ...defOpts, ...options, listenOpts, connectionOpts, providers };
        return opts;
    }

    protected defaultProviders() {
        return TRANSPORT_SERVR_PROVIDERS;
    }

    protected middlewareFilter() {

    }

    protected override initContext(options: TOpts): void {
        this.context.get(ModuleRef).setValue(ListenOpts, options.listenOpts);

        if (options.content && !isBoolean(options.content)) {
            this.context.setValue(ContentOptions, options.content)
        }

        if (options.mimeDb) {
            const mimedb = this.context.injector.get(MimeDb);
            mimedb.from(options.mimeDb)
        }
        super.initContext(options)
    }

}

interface Closeable {
    /**
     * Stops the server from accepting new connections and keeps existing
     * connections. This function is asynchronous, the server is finally closed
     * when all connections are ended and the server emits a `'close'` event.
     * The optional `callback` will be called once the `'close'` event occurs. Unlike
     * that event, it will be called with an `Error` as its only argument if the server
     * was not open when it was closed.
     * @since v0.1.90
     * @param callback Called when the server is closed.
     */
    close(callback?: (err?: Error) => void): this;
}