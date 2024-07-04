import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { AbstractRequest, Pattern, ResponseEvent, UrlRequestInitOpts } from '@tsdi/common';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { COAP_CLIENT_OPTS, CoapClientOpts } from './options';
import { CoapHandler } from './handler';
import { defaultMaxSize } from '../trans';


/**
 * COAP Client.
 */
@Injectable()
export class CoapClient extends Client<AbstractRequest<any>, ResponseEvent<any, string>, CoapClientOpts> {
    private socket?: Socket | null;
    private session?: ClientTransportSession | null;

    constructor(readonly handler: CoapHandler) {
        super();
    }

    protected async connect(): Promise<any> {
        if (!this.session) {
            const options = this.getOptions();
            const connectOpts = {
                type: 'udp4',
                sendBufferSize: options.transportOpts?.maxSize ?? defaultMaxSize,
                ...options.connectOpts
            } as SocketOptions;
            this.socket = createSocket(connectOpts);
            const transportOpts = options.transportOpts!;
            if (!transportOpts.host) {
                transportOpts.host = new URL(options.url!).host;
            }
            const injector = this.handler.injector;
            this.session = this.handler.injector.get(ClientTransportSessionFactory).create(injector, this.socket, options);
        }
    }

    protected async onShutdown(): Promise<void> {
        this.socket?.close();
        this.session?.destroy();
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(ClientTransportSession, this.session)
    }

    protected createRequest(pattern: Pattern, options: UrlRequestInitOpts) {
        throw new Error('Method not implemented.');
    }
}
