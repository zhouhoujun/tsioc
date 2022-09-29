import { Endpoint, IncomingHeaders, ListenOpts, ModuleRef, Router, Server, TransportEvent, TransportStrategy } from '@tsdi/core';
import { Abstract, Destroyable, EMPTY_OBJ, Execption, isBoolean, isFunction, lang, ProviderType, TypeOf } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { Duplex } from 'stream';
import { CatchInterceptor, LogInterceptor, RespondInterceptor } from '../interceptors';
import { TransportContext, SERVER_EXECPTION_FILTERS, SERVER_MIDDLEWARES } from './context';
import { BodyparserMiddleware, ContentMiddleware, ContentOptions, EncodeJsonMiddleware, SessionMiddleware } from '../middlewares';
import { MimeDb } from '../mime';
import { db } from '../impl/mimedb';
import { TransportExecptionFilter, TransportFinalizeFilter } from './finalize-filter';
import { TransportServerOpts, SERVER_INTERCEPTORS, SERVER_TRANSPORT_INTERCEPTORS } from './options';
import { ServerRequest } from './req';
import { ServerResponse } from './res';
import { TRANSPORT_SERVR_PROVIDERS } from './providers';
import { ServerStream } from './stream';
import { Connection, ConnectionOpts, Packetor } from '../connection';
import { finalize, mergeMap, Observable, Subscriber, Subscription } from 'rxjs';
import { ev, hdr } from '../consts';
import { ServerConnection } from '../stream/client/connection';
import { isDuplex } from '../utils';
import { ServerTransportStrategy } from './strategy';


const defOpts = {
    sizeLimit: 10 * 1024 * 1024,
    interceptorsToken: SERVER_INTERCEPTORS,
    execptionsToken: SERVER_EXECPTION_FILTERS,
    middlewaresToken: SERVER_MIDDLEWARES,
    transport: {
        interceptorsToken: SERVER_TRANSPORT_INTERCEPTORS,
        strategy: ServerTransportStrategy
    },
    content: {
        root: 'public'
    },
    mimeDb: db,
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        RespondInterceptor
    ],
    execptions: [
        TransportFinalizeFilter,
        TransportExecptionFilter
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
export abstract class TransportServer<T extends EventEmitter = any, TOpts extends TransportServerOpts = TransportServerOpts> extends Server<ServerRequest, ServerResponse, TransportContext, TOpts> {

    private _server: T | null = null;
    constructor(options: TOpts) {
        super(options)
    }

    get proxy(): boolean {
        return this.getOptions().proxy === true;
    }

    get server(): T | null {
        return this._server;
    }

    async start(): Promise<void> {
        try {
            const opts = this.getOptions();
            const server = this._server = this.createServer(opts);
            const logger = this.logger;
            const strategy = this.context.get(ServerTransportStrategy);
            const sub = this.onConnection(server, strategy, opts.connectionOpts)
                .pipe(mergeMap(conn => this.onRequest(conn, strategy)))
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


    protected onConnection(server: T, strategy: ServerTransportStrategy, opts?: ConnectionOpts): Observable<Connection> {
        return new Observable((observer) => {
            const onError = (err: Error) => {
                observer.error(err);
            };
            const onConnection = (conn: any, ...args: any[]) => {
                const duplex = isDuplex(conn) ? conn : strategy.parseToDuplex(conn, ...args);
                const connection = strategy.createConnection(duplex, opts);
                observer.next(connection);
            }
            const onClose = () => {
                observer.complete();
            }
            server.on(ev.ERROR, onError);
            server.on(ev.CONNECTION, onConnection);
            server.on(ev.CLOSE, onClose)

            return () => {
                server.off(ev.ERROR, onError);
                server.off(ev.CLOSE, onClose);
                server.off(ev.CONNECTION, onConnection);
            }
        })
    }

    protected onRequest(conn: Connection, strategy: ServerTransportStrategy): Observable<any> {
        return strategy.request(conn, this.endpoint());
        // return new Observable((observer) => {
        //     const subs: Set<Subscription> = new Set();

        //     const onHeaders = (headers: IncomingHeaders, id: number) => {
        //         const sid = conn.getNextStreamId(id);
        //         const stream = this.createStream(conn, sid, headers);
        //         conn.emit(ev.STREAM, stream, headers);
        //     };


        //     const onStream = (stream: ServerStream, headers: IncomingHeaders) => {
        //         const ctx = this.buildContext(stream, headers);
        //         subs.add(this.handle(ctx, this.endpoint(), observer));
        //     };

        //     conn.on(ev.HEADERS, onHeaders);
        //     conn.on(ev.STREAM, onStream);
        //     return () => {
        //         subs.forEach(s => {
        //             s && s.unsubscribe();
        //         });
        //         subs.clear();
        //         conn.off(ev.HEADERS, onHeaders);
        //         conn.off(ev.STREAM, onStream);
        //     }
        // });
    }


    protected abstract createServer(opts: TOpts): T;



    /**
     * listen
     * @param server 
     * @param opts 
     */
    protected abstract listen(server: T, opts: ListenOpts): Promise<void>;
    /**
     * 
     * handle request.
     * @param context 
     * @param endpoint 
     */
    protected handle(ctx: TransportContext, endpoint: Endpoint, subscriber: Subscriber<TransportEvent>): Subscription {
        const req = ctx.request;
        const cancel = endpoint.handle(req, ctx)
            .pipe(finalize(() => ctx.destroy))
            .subscribe(subscriber);
        const opts = ctx.target.getOptions() as TransportServerOpts;
        opts.timeout && req.setTimeout(opts.timeout, () => {
            req.emit(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        req.once(ev.CLOSE, async () => {
            await lang.delay(500);
            cancel?.unsubscribe();
            if (!ctx.sent) {
                ctx.response.end()
            }
        });
        return cancel;
    }

    protected buildContext(stream: ServerStream, headers: IncomingHeaders): TransportContext {
        const request = new ServerRequest(stream, headers);
        const response = new ServerResponse(stream, headers);
        const parent = this.context;
        return new TransportContext(parent.injector, request, response, this, { parent });
    }


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
        const providers = options && options.providers ? [...TRANSPORT_SERVR_PROVIDERS, ...options.providers] : TRANSPORT_SERVR_PROVIDERS;
        const opts = { ...defOpts, ...options, listenOpts, connectionOpts, providers };
        if (opts.middlewares) {
            opts.middlewares = opts.middlewares.filter(m => {
                if (!opts.session && m === SessionMiddleware) return false;
                if (!opts.content && m === ContentMiddleware) return false;
                return true
            });
        }
        return opts;
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

    protected override registerStrategy(strategy: TypeOf<ServerTransportStrategy>): void {
        const pdrs: ProviderType[] = [];
        if (isFunction(strategy)) {
            pdrs.push({ provide: TransportStrategy, useExisting: strategy });
            pdrs.push({ provide: ServerTransportStrategy, useExisting: strategy });
        } else {
            pdrs.push({ provide: TransportStrategy, useValue: strategy });
            pdrs.push({ provide: ServerTransportStrategy, useValue: strategy });
        }
        this.context.injector.inject(pdrs);
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