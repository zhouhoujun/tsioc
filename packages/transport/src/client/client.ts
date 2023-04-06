import {
    OnDispose, Client, RequestOptions,
    TransportRequest, Pattern, TransportEvent
} from '@tsdi/core';
import { Abstract, AsyncLike, isPromise } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { defer, isObservable, map, mergeMap, Observable, of, Subscriber } from 'rxjs';
import { CLIENT_EXECPTION_FILTERS, CLIENT_INTERCEPTORS, TransportClientOpts } from './options';
import { ClientFinalizeFilter } from './filter';
import { TRANSPORT_CLIENT_PROVIDERS } from './providers';
import { BodyContentInterceptor } from './body';
import { Events } from '../connection';
import { Cleanup, ev } from '../consts';



const tsptDeftOpts = {
    interceptors: [
        BodyContentInterceptor
    ],
    filters: [
        // InOutInterceptorFilter,
        ClientFinalizeFilter
    ],
    interceptorsToken: CLIENT_INTERCEPTORS,
    execptionFiltersToken: CLIENT_EXECPTION_FILTERS,
} as TransportClientOpts;


/**
 * Transport Client.
 */
@Abstract()
export abstract class TransportClient<TConnection extends EventEmitter = EventEmitter,
    TPattern = Pattern,
    ReqOpts extends RequestOptions = RequestOptions,
    TOpts extends TransportClientOpts<TRequest, TResponse> = any,
    TRequest extends TransportRequest = TransportRequest,
    TResponse extends TransportEvent = TransportEvent> extends Client<TPattern, ReqOpts, TOpts, TRequest, TResponse> implements OnDispose {

    private _conn?: TConnection;
    constructor(options: TOpts) {
        super(options);
    }

    get connection(): TConnection {
        return this._conn ?? null!;
    }

    protected set connection(val: TConnection) {
        this._conn = val;
    }

    abstract close(): Promise<void>;


    async onDispose(): Promise<void> {
        await this.close();
        await this.context.destroy();
    }

    protected override getDefaultOptions(): TOpts {
        return tsptDeftOpts as TOpts;
    }

    protected override defaultProviders() {
        return TRANSPORT_CLIENT_PROVIDERS
    }

    protected override initOption(options?: TOpts): TOpts {
        const opts = super.initOption(options);
        const dOpts = this.getDefaultOptions();
        if (options?.connectOpts) opts.connectOpts = { ...dOpts.connectOpts, ...options.connectOpts };
        if (options?.connectionOpts) opts.connectionOpts = { ...dOpts.connectionOpts, ...options?.connectionOpts }

        return opts as TOpts;
    }

    protected buildRequest(context: ClientEndpointContext, url: TPattern | TRequest, options?: ReqOpts): TRequest {
        return url instanceof TransportRequest ? url : new TransportRequest(url as Pattern, { context, ...options }) as TRequest;
    }

    private $conn?: Observable<TConnection> | null;
    protected connect(): Observable<TConnection> {
        if (this.connection && this.isValid(this.connection)) {
            return of(this.connection);
        }

        if (this.$conn) return this.$conn;

        const opts = this.getOptions();
        const conn = this.createConnection(opts);
        return this.$conn = isObservable(conn) ? conn : defer(() => isPromise(conn) ? conn : Promise.resolve(conn))
            .pipe(
                mergeMap(connection => this.onConnect(connection, opts)),
                map(connection => {
                    this._conn = connection;
                    this.$conn = null;
                    return connection;
                })
            );

    }

    protected abstract isValid(connection: TConnection): boolean;

    /**
     * create Duplex.
     * @param opts 
     */
    protected abstract createConnection(opts: TOpts): AsyncLike<TConnection>;

    /**
     * on client connect.
     * @usageNotes
     * 
     * ### Example
     * 
     * ```typescript
     * 
     * class MyClient extends TransportClient {
     *   ...
     *   protected override onConnect(duplex: Duplex, opts?: ConnectionOpts): Observable<Connection> {
     *       const logger = this.logger;
     *       const packetor = this.context.get(Packetor);
     *       return new Observable((observer: Observer<Connection>) => {
     *          const client = new Connection(duplex, packetor, opts);
     *           if (opts.keepalive) {
     *               client.setKeepAlive(true, opts.keepalive);
     *           }
     *
     *           const onError = (err: Error) => {
     *               logger.error(err);
     *               observer.error(err);
     *           }
     *           const onClose = () => {
     *               client.end();
     *           };
     *           const onConnected = () => {
     *               observer.next(client);
     *           }
     *           client.on(ev.ERROR, onError);
     *           client.on(ev.CLOSE, onClose);
     *           client.on(ev.END, onClose);
     *           client.on(ev.CONNECT, onConnected);
     *
     *           return () => {
     *               client.off(ev.ERROR, onError);
     *               client.off(ev.CLOSE, onClose);
     *               client.off(ev.END, onClose);
     *               client.off(ev.CONNECT, onConnected);
     *           }
     *       });
     *   }
     * }
     * ```
     * 
     * @param connection 
     * @param opts 
     */
    protected onConnect(connection: TConnection, opts: TOpts): Observable<TConnection> {
        return new Observable((observer) => {
            let cleanup: Cleanup;
            this.setupConnection(connection, observer, opts)
                .then(clean => {
                    cleanup = clean;
                })
                .catch(err => observer.error(err));

            return () => {
                cleanup?.()
            }
        })
    }

    protected async setupConnection(connection: TConnection, observer: Subscriber<TConnection>, opts: TOpts): Promise<Cleanup> {
        const events: Events = {};
        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            for (const e in events) {
                connection.off(e, events[e]);
                events[e] = null!;
            }
        };
        events[this.connectEventName()] = () => {
            this.onConnected();
            observer.next(connection);
            observer.complete();
        }
        events[ev.ERROR] = events[ev.TIMEOUT] = (err: Error) => observer.error(err);
        events[ev.CLOSE] = events[ev.END] = () => {
            this.onDisconnected();
            observer.complete();
        };
        for (const e in events) {
            connection.on(e, events[e]);
        }
        return cleanup;
    }

    protected onDisconnected(): void { }

    protected onConnected(): void { }

    protected connectEventName() {
        return ev.CONNECT;
    }

}
