import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { TransportRequest } from '@tsdi/common';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { UdpHandler } from './handler';
import { UDP_CLIENT_OPTS, UdpClientOpts } from './options';
import { defaultMaxSize } from '../consts';



@Injectable()
export class UdpClient extends Client<TransportRequest> {
    private socket?: Socket | null;
    private session?: ClientTransportSession | null;

    constructor(
        readonly handler: UdpHandler,
        @Inject(UDP_CLIENT_OPTS) private options: UdpClientOpts) {
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
            const injector = this.handler.injector;
            this.session = injector.get(ClientTransportSessionFactory).create(injector, this.socket, this.options.transportOpts!);
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

}
