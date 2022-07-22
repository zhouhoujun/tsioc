import { EndpointBackend, RequestContext, RequstOption, TransportClient, UuidGenerator } from '@tsdi/core';
import { EMPTY, Inject, Injectable, InvocationContext, isString, Nullable } from '@tsdi/ioc';
import { JsonDecoder, JsonEncoder } from '../coder';
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


@Injectable()
export class TransportProtocolClient extends TransportClient<TransportRequest, TransportEvent> {

    private option!: ProtocolClientOpts;
    constructor(
        @Inject() context: InvocationContext,
        @Nullable() options: ProtocolClientOpts) {
        super(context, options);
    }

    private _protocol?: TransportProtocol;

    get protocol() {
        if (!this._protocol) {
            this._protocol = this.context.get(TransportProtocol);
        }
        return this._protocol;
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
        return this.protocol.connect();
    }

    protected getBackend(): EndpointBackend<TransportRequest<any>, TransportEvent<any>> {
        return this.context.get(this.option.backend!);
    }

}