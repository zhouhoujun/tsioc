import { EndpointBackend, Protocol, RequestContext, RequstOption, TransportClient, UuidGenerator } from '@tsdi/core';
import { EMPTY, Inject, Injectable, InvocationContext, isString, Nullable, Providers } from '@tsdi/ioc';
import { LISTEN_OPTS } from '@tsdi/platform-server';
import { JsonDecoder, JsonEncoder } from '../coder';
import { TrasportMimeAdapter } from '../impl/mime';
import { MimeAdapter } from '../mime';
import { TransportProtocol } from '../protocol';
import { ProtocolBackend } from './backend';
import { DetectBodyInterceptor } from './body';
import { CLIENT_EXECPTIONFILTERS, CLIENT_INTERCEPTORS, ProtocolClientOpts } from './options';
import { NormlizePathInterceptor } from './path';
import { TransportRequest } from './request';
import { TransportEvent } from './response';


const defaults = {
    delimiter: '\r\n',
    encoding: 'utf8',
    encoder: JsonEncoder,
    decoder: JsonDecoder,
    backend: ProtocolBackend,
    interceptorsToken: CLIENT_INTERCEPTORS,
    execptionsToken: CLIENT_EXECPTIONFILTERS,
} as ProtocolClientOpts;

/**
 * Transport Protocol Client.
 */
@Injectable()
@Providers([
    { provide: MimeAdapter, useClass: TrasportMimeAdapter, asDefault: true },
    { provide: Protocol, useExisting: TransportProtocol }
])
export class ProtocolClient extends TransportClient<TransportRequest, TransportEvent> {

    private option!: ProtocolClientOpts;
    constructor(
        @Inject() context: InvocationContext,
        @Nullable() options: ProtocolClientOpts) {
        super(context, options);
    }

    protected override initOption(options?: ProtocolClientOpts): ProtocolClientOpts {
        const connectOpts = { ...defaults.connectOpts, ...options?.connectOpts };
        const interceptors = [...options?.interceptors ?? EMPTY, NormlizePathInterceptor, DetectBodyInterceptor];
        this.option = { ...defaults, ...options, connectOpts, interceptors };
        this.context.setValue(ProtocolClientOpts, this.option);
        return this.option;
    }


    protected buildRequest(context: RequestContext, url: string | TransportRequest<any>, options?: RequstOption | undefined): TransportRequest<any> {
        return isString(url) ? new TransportRequest(this.context.resolve(UuidGenerator).generate(), { ...options, url }) : url
    }

    protected connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    protected getBackend(): EndpointBackend<TransportRequest<any>, TransportEvent<any>> {
        return this.context.get(this.option.backend!);
    }

}