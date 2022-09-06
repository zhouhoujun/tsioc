import { EndpointBackend, OnDispose, RequestContext, Client, RequestOptions, Packet } from '@tsdi/core';
import { EMPTY, Injectable, isString, Nullable } from '@tsdi/ioc';
import { map, Observable, of } from 'rxjs';
import { ClientSession } from './session';
import { RestfulEndpointBackend } from './backend';
import { CLIENT_EXECPTIONFILTERS, CLIENT_INTERCEPTORS, TransportClientOpts } from './options';
// import { DetectBodyInterceptor } from './body';
// import { NormlizePathInterceptor } from './path';
import { TRANSPORT_CLIENT_PROVIDERS } from './providers';
import { TransportEvent } from './response';
import { ClientBuilder } from './builder';


const tsptDeftOpts = {
    backend: RestfulEndpointBackend,
    interceptorsToken: CLIENT_INTERCEPTORS,
    execptionsToken: CLIENT_EXECPTIONFILTERS
} as TransportClientOpts;


/**
 * Transport Client.
 */

@Injectable()
export class TransportClient<ReqOpts extends RequestOptions = RequestOptions> extends Client<Packet, TransportEvent, TransportClientOpts, ReqOpts> implements OnDispose {

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
        const interceptors = [...options?.interceptors ?? EMPTY];
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

    protected buildRequest(context: RequestContext, url: string | Packet, options?: ReqOpts | undefined): Packet {
        context.setValue(ClientSession, this.connection);
        const opts = this.getOptions();
        const builder = this.context.get(opts.builder!);
        return isString(url) ? builder.buildRequest(url, options) : url;
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

