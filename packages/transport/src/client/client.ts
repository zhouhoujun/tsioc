import { EndpointBackend, RequestContext, RequstOption, TransportClient, UuidGenerator } from '@tsdi/core';
import { EMPTY, Injectable, isString, Nullable } from '@tsdi/ioc';
import { JsonDecoder, JsonEncoder } from '../coder';
import { ProtocolBackend } from './backend';
import { DetectBodyInterceptor } from './body';
import { CLIENT_EXECPTIONFILTERS, CLIENT_INTERCEPTORS, ProtocolClientOpts } from './options';
import { NormlizePathInterceptor } from './path';
import { PROTOCOL_CLIENT_PROVIDERS } from './providers';
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
export class ProtocolClient extends TransportClient<TransportRequest, TransportEvent, ProtocolClientOpts> {

    constructor(@Nullable() options: ProtocolClientOpts) {
        super(options);
    }

    protected override initOption(options?: ProtocolClientOpts): ProtocolClientOpts {
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
        return isString(url) ? new TransportRequest(this.context.resolve(UuidGenerator).generate(), { ...options, url }) : url
    }

    protected connect(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    protected getBackend(): EndpointBackend<TransportRequest<any>, TransportEvent<any>> {
        return this.context.get(this.getOptions().backend!);
    }

}