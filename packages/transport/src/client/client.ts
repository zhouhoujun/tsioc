import { EndpointBackend, OnDispose, ClientEndpointContext, Client, RequestOptions, Message, TransportEvent, TransportRequest, Pattern, TransportStrategy } from '@tsdi/core';
import { Abstract, EMPTY, isFunction, ProviderType, TypeOf } from '@tsdi/ioc';
import { map, Observable, Observer, of } from 'rxjs';
import { Duplex } from 'stream';
import { TransportBackend } from './backend';
import { CLIENT_EXECPTIONFILTERS, CLIENT_INTERCEPTORS, CLIENT_TRANSPORT_INTERCEPTORS, TransportClientOpts } from './options';
import { TRANSPORT_CLIENT_PROVIDERS } from './providers';
import { BodyContentInterceptor } from './body';
import { Connection, ConnectionOpts, Packetor } from '../connection';
import { ev } from '../consts';
import { ClientTransportStrategy } from './strategy';


const tsptDeftOpts = {
    backend: TransportBackend,
    transport: {
        interceptorsToken: CLIENT_TRANSPORT_INTERCEPTORS,
        strategy: ClientTransportStrategy
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
        return this.buildConnection(opts)
            .pipe(
                map(conn => {
                    this._connection = conn;
                    return conn;
                })
            );
    }

    protected buildConnection(opts: TOpts): Observable<Connection> {
        const logger = this.logger;
        const strategy = this.context.get(ClientTransportStrategy);
        return new Observable((observer: Observer<Connection>) => {
            const client = strategy.createConnection(opts);
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

    protected override registerStrategy(strategy: TypeOf<ClientTransportStrategy>): void {
        const pdrs: ProviderType[] = [];
        if (isFunction(strategy)) {
            pdrs.push({ provide: TransportStrategy, useExisting: strategy });
            pdrs.push({ provide: ClientTransportStrategy, useExisting: strategy });
        } else {
            pdrs.push({ provide: TransportStrategy, useValue: strategy });
            pdrs.push({ provide: ClientTransportStrategy, useValue: strategy });
        }
        this.context.injector.inject(pdrs);
    }

}

