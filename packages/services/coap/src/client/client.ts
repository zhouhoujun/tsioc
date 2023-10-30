import { TransportRequest, TransportSession, TransportSessionFactory } from '@tsdi/common';
import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { Client } from '@tsdi/common/client';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { COAP_CLIENT_OPTS, CoapClientOpts } from './options';
import { CoapHandler } from './handler';
import { defaultMaxSize } from '../trans';


/**
 * COAP Client.
 */
@Injectable()
export class CoapClient extends Client<TransportRequest, string> {
    private socket?: Socket | null;
    private session?: TransportSession | null;

    constructor(
        readonly handler: CoapHandler,
        @Inject(COAP_CLIENT_OPTS) private options: CoapClientOpts) {
        super();
    }

    protected async connect(): Promise<any> {
        if (!this.session) {
            const connectOpts = {
                type: 'udp4',
                sendBufferSize: this.options.transportOpts?.maxSize ?? defaultMaxSize,
                ...this.options.connectOpts
            } as SocketOptions;
            this.socket = createSocket(connectOpts);
            const transportOpts = this.options.transportOpts!;
            if (!transportOpts.host) {
                transportOpts.host = new URL(this.options.url!).host;
            }
            this.session = this.handler.injector.get(TransportSessionFactory).create(this.socket, this.options.transportOpts!);
        }
    }

    protected async onShutdown(): Promise<void> {
        this.socket?.close();
        this.session?.destroy();
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(TransportSession, this.session)
    }


}
