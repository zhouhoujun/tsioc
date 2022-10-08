import { OnDispose, ClientEndpointContext, Client, RequestOptions, TransportRequest, Pattern, TransportStrategy, ConnectionManager, Sender } from '@tsdi/core';
import { Abstract, EMPTY } from '@tsdi/ioc';
import { map, Observable, of } from 'rxjs';
import { ClientEndpointBackend, TransportBackend } from './backend';
import { CLIENT_EXECPTIONFILTERS, CLIENT_INTERCEPTORS, TransportClientOpts } from './options';
import { TRANSPORT_CLIENT_PROVIDERS } from './providers';
import { BodyContentInterceptor } from './body';
import { Connection } from '../connection';



const tsptDeftOpts = {
    backendToken: ClientEndpointBackend,
    backend: TransportBackend,
    transport: {
        strategy: TransportStrategy
    },
    interceptors: [
        BodyContentInterceptor
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
        await this._connection?.close();
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

    protected buildRequest(context: ClientEndpointContext, url: Pattern | TransportRequest, options?: ReqOpts | undefined): TransportRequest {
        context.setValue(Connection, this.connection);
        return url instanceof TransportRequest ? url : this.createRequest(url, options);
    }

    protected createRequest(pattern: Pattern, options?: ReqOpts) {
        return new TransportRequest(pattern, options);
    }

    protected connect(): Observable<Connection> {
        if (this._connection && !this._connection.destroyed && !this._connection.isClosed) {
            return of(this._connection);
        }
        const opts = this.getOptions();
        return this.context.get(ConnectionManager).connect(this.createDuplex(opts), opts.connectionOpts)
            .pipe(
                map(conn => {
                    this._connection = conn;
                    return conn;
                })
            );
    }

    protected abstract createDuplex(opts: TOpts): any;

    // protected buildConnection(opts: TOpts): Observable<Connection> {
    //     const logger = this.logger;
    //     return new Observable((observer: Observer<Connection>) => {
    //         const client = this.createConnection(opts);
    //         if (opts.keepalive) {
    //             client.setKeepAlive(true, opts.keepalive);
    //         }

    //         const onError = (err: Error) => {
    //             logger.error(err);
    //             observer.error(err);
    //         }
    //         const onClose = () => {
    //             client.end();
    //         };
    //         const onConnected = () => {
    //             observer.next(client);
    //         }
    //         client.on(ev.ERROR, onError);
    //         client.on(ev.CLOSE, onClose);
    //         client.on(ev.END, onClose);
    //         client.on(ev.CONNECT, onConnected);

    //         return () => {
    //             client.off(ev.ERROR, onError);
    //             client.off(ev.CLOSE, onClose);
    //             client.off(ev.END, onClose);
    //             client.off(ev.CONNECT, onConnected);
    //         }
    //     });
    // }

}

