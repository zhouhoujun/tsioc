import { EndpointBackend, OnDispose, RequestContext, Client, RequestOptions, Message, TransportEvent, TransportRequest, Pattern } from '@tsdi/core';
import { Abstract, EMPTY } from '@tsdi/ioc';
import { map, Observable, Observer, of } from 'rxjs';
import { Duplex } from 'stream';
import { ClientConnection, RequestStrategy } from './connection';
import { TransportBackend } from './backend';
import { CLIENT_EXECPTIONFILTERS, CLIENT_INTERCEPTORS, TransportClientOpts } from './options';
import { TRANSPORT_CLIENT_PROVIDERS } from './providers';
import { BodyContentInterceptor } from './body';
import { ev } from '../consts';
import { StreamTransportStrategy } from '../strategy';
import { ConnectionOpts } from '../connection';


const tsptDeftOpts = {
    backend: TransportBackend,
    interceptors: [BodyContentInterceptor],
    interceptorsToken: CLIENT_INTERCEPTORS,
    execptionsToken: CLIENT_EXECPTIONFILTERS
} as TransportClientOpts;


/**
 * Transport Client.
 */

@Abstract()
export abstract class TransportClient<ReqOpts extends RequestOptions = RequestOptions, TOpts extends TransportClientOpts = TransportClientOpts> extends Client<Pattern, ReqOpts, TOpts> implements OnDispose {

    private _connection?: ClientConnection;
    constructor(options: TOpts) {
        super(options);
    }

    get connection(): ClientConnection {
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
        const opts = { ...tsptDeftOpts, ...defaults, ...options, connectOpts, connectionOpts, interceptors, providers };
        return opts as TOpts;
    }

    protected buildRequest(context: RequestContext, url: Pattern | TransportRequest, options?: ReqOpts | undefined): TransportRequest {
        context.setValue(ClientConnection, this.connection);
        return url instanceof TransportRequest ? url : this.createRequest(url, options);
    }

    protected createRequest(pattern: Pattern, options?: ReqOpts) {
        return new TransportRequest(pattern, options);
    }

    protected connect(): Observable<ClientConnection> {
        if (this._connection && !this._connection.destroyed && !this._connection.isClosed) {
            return of(this._connection);
        }
        const opts = this.getOptions();
        return this.buildConnection(opts)
            .pipe(
                map(stream => {
                    this._connection = stream;
                    return stream;
                })
            );
    }

    protected abstract createDuplex(opts: TOpts): Duplex;

    protected createConnection(duplex: Duplex, transport: StreamTransportStrategy, strategy: RequestStrategy, opts?: ConnectionOpts): ClientConnection {
        return new ClientConnection(duplex, transport, opts, strategy);
    }

    protected buildConnection(opts: TOpts): Observable<ClientConnection> {
        const logger = this.logger;
        return new Observable((observer: Observer<ClientConnection>) => {
            const transport = this.context.get(opts.transport ?? StreamTransportStrategy);
            const strategy = this.context.get(opts.request ?? RequestStrategy);
            const duplex = this.createDuplex(opts);
            const client = this.createConnection(duplex, transport, strategy, opts.connectionOpts);
            if (opts.keepalive) {
                client.setKeepAlive(true, opts.keepalive);
            }

            const onError = (err: Error) => {
                logger.error(err);
                observer.error(err);
            }
            const onClose = () => {
                client.end();
            };
            const onConnected = () => {
                observer.next(client);
            }
            client.on(ev.ERROR, onError);
            client.on(ev.CLOSE, onClose);
            client.on(ev.END, onClose);
            client.on(ev.CONNECT, onConnected);

            return () => {
                client.off(ev.ERROR, onError);
                client.off(ev.CLOSE, onClose);
                client.off(ev.END, onClose);
                client.off(ev.CONNECT, onConnected);
            }
        });
    }

    protected getBackend(): EndpointBackend<Message, TransportEvent> {
        return this.context.get(this.getOptions().backend!);
    }

}

