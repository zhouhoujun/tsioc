import { EndpointBackend, OnDispose, RequestContext, RequstOption, Client } from '@tsdi/core';
import { EMPTY, Injectable, isString, Nullable } from '@tsdi/ioc';
import { map, Observable, of } from 'rxjs';
import { ClientSession } from './session';
import { TransportBackend } from './backend';
import { DetectBodyInterceptor } from './body';
import { CLIENT_EXECPTIONFILTERS, CLIENT_INTERCEPTORS, TransportClientOpts } from './options';
import { NormlizePathInterceptor } from './path';
import { TRANSPORT_CLIENT_PROVIDERS } from './providers';
import { TransportRequest } from './request';
import { TransportEvent } from './response';
import { ClientBuilder } from './builder';


const defaults = {
    encoding: 'utf8',
    backend: TransportBackend,
    interceptorsToken: CLIENT_INTERCEPTORS,
    execptionsToken: CLIENT_EXECPTIONFILTERS
} as TransportClientOpts;


/**
 * Transport Client.
 */
@Injectable()
export class TransportClient extends Client<TransportRequest, TransportEvent, TransportClientOpts> implements OnDispose {

    private _session?: ClientSession;
    constructor(@Nullable() options: TransportClientOpts) {
        super(options);
    }

    get session(): ClientSession {
        return this._session ?? null!;
    }

    async close(): Promise<void> {
        await this._session?.close();
    }

    async onDispose(): Promise<void> {
        await this.close();
        await this.context.destroy();
    }

    protected getDefaultOptions() {
        return defaults;
    }

    protected override initOption(options?: TransportClientOpts): TransportClientOpts {
        const defaults = this.getDefaultOptions();
        const connectOpts = { ...defaults.connectOpts, ...options?.connectOpts };
        const connectionOpts = { ...defaults.connectionOpts, ...options?.connectionOpts };
        const interceptors = [...options?.interceptors ?? EMPTY, NormlizePathInterceptor, DetectBodyInterceptor];
        const providers = options && options.providers ? [...TRANSPORT_CLIENT_PROVIDERS, ...options.providers] : TRANSPORT_CLIENT_PROVIDERS;
        const opts = { ...defaults, ...options, connectOpts, connectionOpts, interceptors, providers };
        return opts;
    }

    protected override initContext(options: TransportClientOpts): void {
        this.context.setValue(TransportClientOpts, options);
        super.initContext(options);
    }


    protected buildRequest(context: RequestContext, url: string | TransportRequest<any>, options?: RequstOption | undefined): TransportRequest<any> {
        context.setValue(ClientSession, this.session);
        return isString(url) ? new TransportRequest({ ...options, url }) : url
    }

    protected connect(): Observable<ClientSession> {
        if (this._session && !this._session.destroyed && !this._session.closed) {
            return of(this._session);
        }
        const opts = this.getOptions();
        return this.context.get(opts.builder ?? ClientBuilder).build(this, opts)
            .pipe(
                map(stream => {
                    this._session = stream;
                    return stream;
                })
            );
    }

    protected getBackend(): EndpointBackend<TransportRequest<any>, TransportEvent<any>> {
        return this.context.get(this.getOptions().backend!);
    }

}

