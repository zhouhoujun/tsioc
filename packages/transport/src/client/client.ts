import {
    OnDispose, ClientEndpointContext, Client, RequestOptions,
    TransportRequest, Pattern, InOutInterceptorFilter
} from '@tsdi/core';
import { Abstract, lang } from '@tsdi/ioc';
import { EventEmitter } from 'events';
import { isObservable, map, mergeMap, Observable, of, Subscriber } from 'rxjs';
import { CLIENT_EXECPTION_FILTERS, CLIENT_INTERCEPTORS, TransportClientOpts } from './options';
import { ClientFinalizeFilter } from './filter';
import { TRANSPORT_CLIENT_PROVIDERS } from './providers';
import { BodyContentInterceptor } from './body';
import { Connection, ConnectionOpts, Events } from '../connection';
import { ev } from '../consts';



const tsptDeftOpts = {
    interceptors: [
        BodyContentInterceptor
    ],
    filters: [
        InOutInterceptorFilter,
        ClientFinalizeFilter
    ],
    interceptorsToken: CLIENT_INTERCEPTORS,
    execptionFiltersToken: CLIENT_EXECPTION_FILTERS,
} as TransportClientOpts;


/**
 * Transport Client.
 */
@Abstract()
export abstract class TransportClient<ReqOpts extends RequestOptions = RequestOptions, TOpts extends TransportClientOpts = TransportClientOpts> extends Client<Pattern, ReqOpts, TOpts> implements OnDispose {

    private _connection?: Connection;
    constructor(options: TOpts) {
        super(options);
    }

    get connection(): Connection {
        return this._connection ?? null!;
    }

    async close(): Promise<void> {
        const defer = lang.defer();
        this._connection?.destroy(undefined, defer.resolve);
        await defer.promise;
    }

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

    protected buildRequest(context: ClientEndpointContext, url: Pattern | TransportRequest, options?: ReqOpts): TransportRequest {
        return url instanceof TransportRequest ? url : new TransportRequest(url, { context, ...options });
    }

    private $conn?: Observable<Connection> | null;
    protected connect(): Observable<Connection> {
        if (this._connection && !this._connection.destroyed && !this._connection.isClosed) {
            return of(this._connection);
        }

        if (this.$conn) return this.$conn;

        const opts = this.getOptions();
        const socket = this.createSocket(opts)
        return this.$conn = (isObservable(socket) ? socket : of(socket))
            .pipe(
                mergeMap(socket => this.onConnect(socket, opts.connectionOpts)),
                map(conn => {
                    this.context.setValue(Connection, conn);
                    this._connection = conn;
                    this.$conn = null;
                    return conn;
                })
            );
    }

    /**
     * create Duplex.
     * @param opts 
     */
    protected abstract createSocket(opts: TOpts): Observable<EventEmitter> | EventEmitter;

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
     * @param socket 
     * @param opts 
     */
    protected onConnect(socket: EventEmitter, opts?: ConnectionOpts): Observable<Connection> {
        return new Observable((observer) => {
            const conn = this.createConnection(socket, opts);
            const evetns = this.createConnectionEvents(conn, observer, opts);
            for (const e in evetns) {
                conn.on(e, evetns[e]);
            }
            return () => {
                for (const e in evetns) {
                    conn.off(e, evetns[e]);
                }
                conn.destroy()
            }
        })
    }

    /**
     * create connection events
     * 
     * @usageNotes
     * 
     * ### Examples
     * 
     * ```typescript
     * 
     *  protected createConnectionEvents(conntion: Connection, observer: Subscriber<Connection>, opts?: ConnectionOpts): Events {
     *   const events: Events = {};
     *   events[ev.ERROR] = (err: Error) => observer.error(err);
     *   events[opts?.connect ?? ev.CONNECT] = () => observer.next(conntion);
     *   events[ev.CLOSE] = events[ev.END] = () => (conntion.end(), observer.complete());
     *
     *   return events;
     * }
     * ```
     * 
     * @param observer 
     * @param opts 
     * @returns 
     */
    protected createConnectionEvents(conntion: Connection, observer: Subscriber<Connection>, opts?: ConnectionOpts): Events {
        const events: Events = {};
        events[ev.ERROR] = (err: Error) => observer.error(err);
        events[opts?.connect ?? ev.CONNECT] = () => observer.next(conntion);
        events[ev.CLOSE] = events[ev.END] = () => (conntion.end(), observer.complete());
        return events;
    }

    /**
     * create connection.
     * @param socket 
     * @param opts 
     */
    protected abstract createConnection(socket: EventEmitter, opts?: ConnectionOpts): Connection;


}

