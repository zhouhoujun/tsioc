import {
    InOutInterceptorFilter, Incoming, ListenOpts, ModuleRef, Outgoing,
    Router, Server, StatusInterceptorFilter, CatchInterceptor
} from '@tsdi/core';
import { Abstract, Destroyable, isBoolean, isFunction, lang } from '@tsdi/ioc';
import { finalize, mergeMap, Observable, Subscriber, Subscription } from 'rxjs';
import { Duplex } from 'stream';
import { EventEmitter } from 'events';
import { LogInterceptor } from '../interceptors';
import { TransportContext, SERVER_MIDDLEWARES } from './context';
import { BodyparserMiddleware, ContentMiddleware, ContentOptions, EncodeJsonMiddleware, SessionMiddleware } from '../middlewares';
import { MimeDb } from '../mime';
import { db } from '../impl/mimedb';
import { ExecptionFinalizeFilter } from './finalize-filter';
import { TransportServerOpts, SERVER_INTERCEPTORS, SERVER_EXECPTION_FILTERS } from './options';
import { TRANSPORT_SERVR_PROVIDERS } from './providers';
import { Connection, ConnectionOpts } from '../connection';
import { ServerInterceptorFinalizeFilter } from './filter';
import { ev } from '../consts';



const defOpts = {
    sizeLimit: 10 * 1024 * 1024,
    interceptorsToken: SERVER_INTERCEPTORS,
    middlewaresToken: SERVER_MIDDLEWARES,
    filtersToken: SERVER_EXECPTION_FILTERS,
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
export abstract class TransportServer<TRequest extends Incoming = Incoming, TResponse extends Outgoing = Outgoing, T extends EventEmitter = any, TOpts extends TransportServerOpts<TRequest, TResponse> = TransportServerOpts<TRequest, TResponse>> extends Server<TRequest, TResponse, TransportContext, TOpts> {

    private _server: T | null = null;
    protected _reqSet: Set<Subscription> = new Set();

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
                .pipe(mergeMap(conn => this.onRequest(conn)))
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
    protected onConnection(server: T, opts?: ConnectionOpts): Observable<Connection> {
        return new Observable((observer) => {
            const evetns = this.createServerEvents(observer, opts);
            for (const e in evetns) {
                server.on(e, evetns[e]);
            }
            return () => {
                for (const e in evetns) {
                    server.off(e, evetns[e]);
                }
            }
        })
    }

    /**
     * create server events
     * @param observer 
     * @param opts 
     * @returns 
     */
    protected createServerEvents(observer: Subscriber<Connection>, opts?: ConnectionOpts): Events {
        const events: Events = {};
        events[ev.ERROR] = (err: Error) => observer.error(err);
        events[ev.CONNECTION] = (socket: Duplex) => observer.next(this.createConnection(socket, opts));
        events[ev.CLOSE] = () => observer.complete();

        return events;
    }

    /**
     * create connection.
     * @param socket 
     * @param opts 
     */
    protected abstract createConnection(socket: Duplex, opts?: ConnectionOpts): Connection;

    /**
     * transform, receive data from remoting.
     * @param conn connection
     * @param endpoint as backend endpoint form receive.
     */
    protected onRequest(conn: Connection): Observable<any> {
        return new Observable((observer) => {
            const events = this.createConnectionEvents(observer);
            for (const e in events) {
                conn.on(e, events[e])
            }

            return () => {
                this._reqSet.forEach(s => {
                    s && s.unsubscribe();
                });
                this._reqSet.clear();
                for (const e in events) {
                    conn.off(e, events[e])
                }
            }
        });
    }

    /**
     * create connection events.
     * @param observer 
     * @returns 
     */
    protected createConnectionEvents(observer: Subscriber<any>): Events {
        const events: Events = {};
        events[ev.REQUEST] = (req: TRequest, res: TResponse) => this.requestHandler(observer, req, res);
        events[ev.ERROR] = (err) => observer.error(err);
        events[ev.CLOSE] = () => observer.complete();

        return events
    }

    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(observer: Subscriber<any>, req: TRequest, res: TResponse): void {
        const ctx = this.createContext(req, res);
        const sub = this.endpoint.handle(req, ctx)
            .pipe(finalize(() => ctx.destroy()))
            .subscribe({
                next: (val) => observer.next(val),
                // error: (err)=> observer.error(err),
                complete: () => {
                    this._reqSet.delete(sub);
                    if (!this._reqSet.size) {
                        observer.complete();
                    }
                }
            });
        this.bindRequestEvents(req, ctx, sub);
        this._reqSet.add(sub);
    }

    protected bindRequestEvents(req: TRequest, ctx: TransportContext<TRequest, TResponse>, cancel: Subscription) {
        const opts = this.getOptions();
        opts.timeout && req.setTimeout && req.setTimeout(opts.timeout, () => {
            req.emit?.(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        req.once?.(ev.CLOSE, async () => {
            await lang.delay(500);
            cancel?.unsubscribe();
            if (!ctx.sent) {
                ctx.response.end()
            }
        });
    }

    /**
     * create context.
     * @param req 
     * @param res 
     */
    protected abstract createContext(req: TRequest, res: TResponse): TransportContext<TRequest, TResponse>;

    /**
     * close.
     */
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

    protected override initOption(options: TOpts): TOpts {
        const opts = super.initOption(options);
        const dOpts = this.getDefaultOptions();
        if (options.listenOpts) opts.listenOpts = { ...dOpts.listenOpts, ...options?.listenOpts };
        if (options.connectionOpts) opts.connectionOpts = { objectMode: true, ...dOpts.connectionOpts, ...options?.connectionOpts };

        return opts;
    }

    protected override getDefaultOptions(): TOpts {
        return defOpts as any;
    }

    protected override defaultProviders() {
        return TRANSPORT_SERVR_PROVIDERS;
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

}

/**
 * events maps.
 */
export interface Events extends Record<string, (...args: any[]) => void> {

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