import {
    InOutInterceptorFilter, Incoming, ListenOpts, ModuleRef, Outgoing,
    Router, Server, StatusInterceptorFilter, CatchInterceptor
} from '@tsdi/core';
import { Abstract, AsyncLike, isBoolean, lang, promisify } from '@tsdi/ioc';
import { finalize, from, mergeMap, Observable, Subscriber, Subscription } from 'rxjs';
import { EventEmitter } from 'events';
import { ev } from '../consts';
import { MimeDb } from '../mime';
import { db } from '../impl/mimedb';
import { LogInterceptor } from '../interceptors';
import { Events } from '../connection';
import { BodyparserMiddleware, ContentMiddleware, ContentOptions, EncodeJsonMiddleware, SessionMiddleware } from '../middlewares';
import { TRANSPORT_SERVR_PROVIDERS } from './providers';
import { ServerFinalizeFilter } from './filter';
import { ExecptionFinalizeFilter } from './execption-filter';
import { SERVER_MIDDLEWARES } from './context';
import { TransportServerOpts, SERVER_INTERCEPTORS, SERVER_EXECPTION_FILTERS } from './options';
import { AssetServerContext } from '../asset.ctx';


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
        ServerFinalizeFilter,
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
export abstract class TransportServer<TServe extends EventEmitter = EventEmitter,
    TRequest extends Incoming = Incoming,
    TResponse extends Outgoing = Outgoing,
    TOpts extends TransportServerOpts<TRequest, TResponse> = TransportServerOpts<TRequest, TResponse>,
    TContext extends AssetServerContext<TRequest, TResponse> = AssetServerContext<TRequest, TResponse>> extends Server<TRequest, TResponse, TContext, TOpts> {

    private _server: TServe | null = null;
    protected _reqSet: Set<Subscription> = new Set();

    constructor(options: TOpts) {
        super(options)
    }

    get server(): TServe {
        return this._server!;
    }

    async start(): Promise<void> {
        try {
            const opts = this.getOptions();
            const logger = this.logger;
            const sub = this.setup(opts)
                .pipe(
                    mergeMap(ser => {
                        return this.listen(opts.listenOpts);
                    })
                )
                .subscribe({
                    error: (err) => {
                        logger.error(err);
                    },
                    complete: () => {
                        this._reqSet.forEach(s => {
                            s && s.unsubscribe();
                        });
                        this._reqSet.clear();
                        logger.info(lang.getClassName(this), 'shutdown');
                    }
                });
            this.context.onDestroy(() => sub?.unsubscribe())
        } catch (err) {
            this.logger.error(err);
        }
    }


    /**
     * close.
     */
    abstract close(): Promise<void>;

    /**
     * setup server.
     * @returns 
     */
    protected setup(opts: TOpts): Observable<TServe> {
        return from(promisify(this.createServer(opts)))
            .pipe(
                mergeMap(server => {
                    this._server = server;
                    return this.bindEvent(server, opts);
                })
            )
    }

    /**
     * create server.
     * @param opts 
     */
    protected abstract createServer(opts: TOpts): AsyncLike<TServe>;
    /**
     * listen
     * @param server 
     * @param opts 
     */
    protected abstract listen(opts?: ListenOpts): Promise<void>;

    /**
     * bind event for server
     * 
     * @param server 
     * @param opts 
     */
    protected bindEvent(server: TServe, opts: TOpts): Observable<TServe> {
        return new Observable((observer) => {
            const events = this.createServerEvents(server, observer, opts);
            for (const e in events) {
                server.on(e, events[e]);
            }
            this.setupServe(server, opts).then(() => {
                observer.next(server);
            })
            return () => {
                this._reqSet.forEach(s => {
                    s && s.unsubscribe();
                });
                this._reqSet.clear();
                for (const e in events) {
                    server.off(e, events[e]);
                }
            }
        })
    }

    /**
     * todo setup server with options. default do nothing.
     * @param server 
     * @param opts 
     */
    protected async setupServe(server: TServe, opts: TOpts): Promise<void> { }

    /**
     * create server events
     * @param observer 
     * @param opts 
     * @returns bound evnets
     */
    protected createServerEvents(server: TServe, observer: Subscriber<TServe>, opts?: TOpts): Events {
        const events: Events = {};

        events[this.requestEventName()] = (...args: any[]) => {
            const [req, res] = this.parseToReqRes(args);
            this.requestHandler(req, res);
        };
        events[ev.ERROR] = (err: Error) => observer.error(err);
        events[ev.CLOSE] = events[ev.END] = () => {
            observer.complete();
            for (const e in events) {
                server.off(e, events[e]);
            }
        }
        return events;
    }

    protected parseToReqRes(args: any[]): [TRequest, TResponse] {
        return args as [TRequest, TResponse];
    }

    protected requestEventName() {
        return ev.REQUEST;
    }

    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(req: TRequest, res: TResponse): Subscription {
        const ctx = this.createContext(req, res);
        const sub = this.endpoint.handle(req, ctx)
            .pipe(finalize(() => ctx.destroy()))
            .subscribe({
                error: (err) => {
                    this.logger.error(err)
                },
                complete: () => {
                    this._reqSet.delete(sub)
                }
            });
        this.bindRequestEvents(req, ctx, sub);
        this._reqSet.add(sub);
        return sub;
    }

    protected bindRequestEvents(req: TRequest, ctx: TContext, cancel: Subscription) {
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
    protected abstract createContext(req: TRequest, res: TResponse): TContext;



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

        super.initContext(options)
        if (options.mimeDb) {
            const mimedb = this.context.injector.get(MimeDb);
            mimedb.from(options.mimeDb)
        }
    }

}
