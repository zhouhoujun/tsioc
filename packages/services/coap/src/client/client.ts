import { Injectable, Context, isString } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, ResponseEvent, UrlRequestOptions } from '@tsdi/common';
import { AbstractClient, ClientTransport, ClientTransportFactory } from '@tsdi/common/client';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { request, Agent } from 'coap';
import { CoapClientConfig } from './options';
import { CoapHandler } from './handler';
import { defaultMaxSize } from '../trans';
import { CoapRequest } from './request';


/**
 * COAP Client.
 */
@Injectable()
export class CoapClient extends AbstractClient<UrlRequestOptions, CoapRequest<any>, ResponseEvent<any, string>, CoapClientConfig> {
    private agent?: Agent | null;
    private transport?: ClientTransport | null;

    constructor(readonly handler: CoapHandler) {
        super();
    }

    protected async connect(): Promise<any> {
        if (!this.transport) {
            const options = this.getOptions();
            const connectOpts = {
                type: 'udp4',
                ...options.connectOpts,
            } as SocketOptions;
            this.agent = new Agent(connectOpts);

            const injector = this.handler.injector;
            this.transport = this.handler.injector.get(ClientTransportFactory).create(injector, this.agent, options);
        }
    }

    protected async onShutdown(): Promise<void> {
        this.transport?.destroy();
    }

    protected override initContext(context: Context): void {
        context.set(CoapClient, this);
        context.set(ClientTransport, this.transport)
    }

    protected createRequest(pattern: Pattern, options: RequestInitOpts<any, UrlRequestOptions>) {
        if (isString(pattern)) {
            return new CoapRequest(pattern, null, options);
        } else {
            return new CoapRequest(this.formatter.format(pattern), pattern, options);
        }
    }
}
