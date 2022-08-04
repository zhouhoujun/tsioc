import { EndpointBackend, OnDispose, RequestContext, RequstOption, TransportClient } from '@tsdi/core';
import { EMPTY, Injectable, isString, Nullable } from '@tsdi/ioc';
import { map, Observable, of } from 'rxjs';
import { ClientSession, ClientSessionStreamBuilder } from './stream';
import { ProtocolBackend } from './backend';
import { DetectBodyInterceptor } from './body';
import { CLIENT_EXECPTIONFILTERS, CLIENT_INTERCEPTORS, ProtocolClientOpts } from './options';
import { NormlizePathInterceptor } from './path';
import { PROTOCOL_CLIENT_PROVIDERS } from './providers';
import { TransportRequest } from './request';
import { TransportEvent } from './response';


const defaults = {
    encoding: 'utf8',
    backend: ProtocolBackend,
    interceptorsToken: CLIENT_INTERCEPTORS,
    execptionsToken: CLIENT_EXECPTIONFILTERS
} as ProtocolClientOpts;


/**
 * Transport Protocol Client.
 */
@Injectable()
export class ProtocolClient extends TransportClient<TransportRequest, TransportEvent, ProtocolClientOpts> implements OnDispose {

    private _stream?: ClientSession;
    constructor(@Nullable() options: ProtocolClientOpts) {
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

    protected override initOption(options?: ProtocolClientOpts): ProtocolClientOpts {
        const defaults = this.getDefaultOptions();
        const connectOpts = { ...defaults.connectOpts, ...options?.connectOpts };
        const interceptors = [...options?.interceptors ?? EMPTY, NormlizePathInterceptor, DetectBodyInterceptor];
        const providers = options && options.providers ? [...PROTOCOL_CLIENT_PROVIDERS, ...options.providers] : PROTOCOL_CLIENT_PROVIDERS;
        const opts = { ...defaults, ...options, connectOpts, interceptors, providers };
        return opts;
    }

    protected override initContext(options: ProtocolClientOpts): void {
        this.context.setValue(ProtocolClientOpts, options);
        super.initContext(options);
    }


    protected buildRequest(context: RequestContext, url: string | TransportRequest<any>, options?: RequstOption | undefined): TransportRequest<any> {
        context.setValue(ClientSession, this.stream);
        return isString(url) ? new TransportRequest({ ...options, url }) : url
    }

    protected connect(): Observable<ClientSession> {
        if (this._stream && !this._stream.destroyed) {
            return of(this._stream);
        }
        return this.context.get(ClientSessionStreamBuilder).build(this.getOptions().connectOpts)
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
