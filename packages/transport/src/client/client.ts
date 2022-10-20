import {
    OnDispose, ClientEndpointContext, Client, RequestOptions,
    TransportRequest, Pattern, TransportStrategy, HanlderFilter
} from '@tsdi/core';
import { Abstract, EMPTY, lang } from '@tsdi/ioc';
import { map, Observable, of } from 'rxjs';
import { Duplex } from 'stream';
import { ClientEndpointBackend, TransportBackend } from './backend';
import { CLIENT_EXECPTIONFILTERS, CLIENT_INTERCEPTORS, TransportClientOpts } from './options';
import { TRANSPORT_CLIENT_PROVIDERS } from './providers';
import { BodyContentInterceptor } from './body';
import { Connection, ConnectionOpts } from '../connection';
import { ClientInterceptorFinalizeFilter } from './filter';



const tsptDeftOpts = {
    backendToken: ClientEndpointBackend,
    backend: TransportBackend,
    transport: {
        strategy: TransportStrategy
    },
    interceptors: [
        BodyContentInterceptor
    ],
    filters: [
        HanlderFilter,
        ClientInterceptorFinalizeFilter
    ],
    interceptorsToken: CLIENT_INTERCEPTORS,
    execptionsToken: CLIENT_EXECPTIONFILTERS,
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

    protected getDefaultOptions() {
        return tsptDeftOpts;
    }

    protected override initOption(options?: TOpts): TOpts {
        const defaults = this.getDefaultOptions();
        const connectOpts = { ...defaults.connectOpts, ...options?.connectOpts };
        const connectionOpts = { objectMode: true, ...defaults.connectionOpts, ...options?.connectionOpts };
        const interceptors = options?.interceptors ?? EMPTY;
        const providers = options && options.providers ? [...TRANSPORT_CLIENT_PROVIDERS, ...options.providers] : TRANSPORT_CLIENT_PROVIDERS;
        const transport = { ...defaults.transport, ...options?.transport };
        const opts = { ...tsptDeftOpts, ...defaults, ...options, transport, connectOpts, connectionOpts, interceptors, providers };
        return opts as TOpts;
    }

    protected buildRequest(context: ClientEndpointContext, url: Pattern | TransportRequest, options?: ReqOpts): TransportRequest {
        return url instanceof TransportRequest ? url : this.createRequest(url, { context, ...options } as ReqOpts);
    }

    protected createRequest(pattern: Pattern, options?: ReqOpts) {
        return new TransportRequest(pattern, options);
    }

    protected connect(): Observable<Connection> {
        if (this._connection && !this._connection.destroyed && !this._connection.isClosed) {
            return of(this._connection);
        }
        const opts = this.getOptions();
        const duplex = this.createDuplex(opts);
        return this.onConnect(duplex, opts.connectionOpts)
            .pipe(
                map(conn => {
                    this.context.setValue(Connection, conn);
                    this._connection = conn;
                    return conn;
                })
            );
    }

    /**
     * create Duplex.
     * @param opts 
     */
    protected abstract createDuplex(opts: TOpts): Duplex;

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
     * @param duplex 
     * @param opts 
     */
    protected abstract onConnect(duplex: Duplex, opts?: ConnectionOpts): Observable<Connection>;

}

