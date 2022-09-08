import { EndpointBackend, OnDispose, RequestContext, Client, RequestOptions, Packet, TransportEvent, TransportRequest } from '@tsdi/core';
import { EMPTY, Injectable, Nullable } from '@tsdi/ioc';
import { map, Observable, of } from 'rxjs';
import { ClientSession } from './session';
import { TransportBackend } from './backend';
import { CLIENT_EXECPTIONFILTERS, CLIENT_INTERCEPTORS, Pattern, TransportClientOpts } from './options';
import { TRANSPORT_CLIENT_PROVIDERS } from './providers';
import { ClientBuilder } from './builder';
import { BodyContentInterceptor } from './body';


const tsptDeftOpts = {
    backend: TransportBackend,
    interceptors: [BodyContentInterceptor],
    interceptorsToken: CLIENT_INTERCEPTORS,
    execptionsToken: CLIENT_EXECPTIONFILTERS
} as TransportClientOpts;


/**
 * Transport Client.
 */

@Injectable()
export class TransportClient<ReqOpts extends RequestOptions = RequestOptions> extends Client<Pattern, ReqOpts, TransportClientOpts> implements OnDispose {

    private _connection?: ClientSession;
    constructor(@Nullable() options: TransportClientOpts) {
        super(options);
    }

    get connection(): ClientSession {
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

    protected override initOption(options?: TransportClientOpts): TransportClientOpts {
        const defaults = this.getDefaultOptions();
        const connectOpts = { ...defaults.connectOpts, ...options?.connectOpts };
        const connectionOpts = { objectMode: true, ...defaults.connectionOpts, ...options?.connectionOpts };
        const interceptors = options?.interceptors ?? EMPTY;
        const providers = options && options.providers ? [...TRANSPORT_CLIENT_PROVIDERS, ...options.providers] : TRANSPORT_CLIENT_PROVIDERS;
        const opts = { ...tsptDeftOpts, ...defaults, ...options, connectOpts, connectionOpts, interceptors, providers };
        if (!opts.builder) {
            opts.builder = ClientBuilder;
        }
        return opts;
    }

    protected override initContext(options: TransportClientOpts): void {
        this.context.setValue(TransportClientOpts, options);
        super.initContext(options);
    }

    protected buildRequest(context: RequestContext, url: Pattern | TransportRequest, options?: ReqOpts | undefined): TransportRequest {
        context.setValue(ClientSession, this.connection);
        const opts = this.getOptions();
        const builder = this.context.get(opts.builder!);
        return url instanceof TransportRequest ? url : builder.buildRequest(url as Pattern, options);
    }

    protected connect(): Observable<ClientSession> {
        if (this._connection && !this._connection.destroyed && !this._connection.isClosed) {
            return of(this._connection);
        }
        const opts = this.getOptions();
        return this.context.get(opts.builder!).build(this, opts)
            .pipe(
                map(stream => {
                    this._connection = stream;
                    return stream;
                })
            );
    }

    protected getBackend(): EndpointBackend<Packet, TransportEvent> {
        return this.context.get(this.getOptions().backend!);
    }

}

