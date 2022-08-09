import { EndpointBackend, OnDispose, RequestContext, RequstOption, Client } from '@tsdi/core';
import { EMPTY, Injectable, isString, Nullable } from '@tsdi/ioc';
import { map, Observable, of } from 'rxjs';
import { ClientSession, ClientSessionBuilder } from './stream';
import { TransportBackend } from './backend';
import { DetectBodyInterceptor } from './body';
import { CLIENT_EXECPTIONFILTERS, CLIENT_INTERCEPTORS, TransportClientOpts } from './options';
import { NormlizePathInterceptor } from './path';
import { PROTOCOL_CLIENT_PROVIDERS } from './providers';
import { TransportRequest } from './request';
import { TransportEvent } from './response';


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

    private _stream?: ClientSession;
    constructor(@Nullable() options: TransportClientOpts) {
        super(options);
    }


    get stream(): ClientSession {
        return this._stream ?? null!;
    }

    async close(): Promise<void> {
        await this._stream?.close();
    }

    onDispose(): Promise<void> {
        return this.close();
    }

    protected getDefaultOptions() {
        return defaults;
    }

    protected override initOption(options?: TransportClientOpts): TransportClientOpts {
        const defaults = this.getDefaultOptions();
        const connectOpts = { ...defaults.connectOpts, ...options?.connectOpts };
        const interceptors = [...options?.interceptors ?? EMPTY, NormlizePathInterceptor, DetectBodyInterceptor];
        const providers = options && options.providers ? [...PROTOCOL_CLIENT_PROVIDERS, ...options.providers] : PROTOCOL_CLIENT_PROVIDERS;
        const opts = { ...defaults, ...options, connectOpts, interceptors, providers };
        return opts;
    }

    protected override initContext(options: TransportClientOpts): void {
        this.context.setValue(TransportClientOpts, options);
        super.initContext(options);
    }


    protected buildRequest(context: RequestContext, url: string | TransportRequest<any>, options?: RequstOption | undefined): TransportRequest<any> {
        context.setValue(ClientSession, this.stream);
        return isString(url) ? new TransportRequest({ ...options, url }) : url
    }

    protected connect(): Observable<ClientSession> {
        if (this._stream && !this._stream.destroyed && !this._stream.closed) {
            return of(this._stream);
        }
        return this.context.get(ClientSessionBuilder).build(this.getOptions().connectOpts)
            .pipe(
                map(stream => {
                    this._stream = stream;
                    return stream;
                })
            );
    }

    protected getBackend(): EndpointBackend<TransportRequest<any>, TransportEvent<any>> {
        return this.context.get(this.getOptions().backend!);
    }

}
