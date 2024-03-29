import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { UdpHandler } from './handler';
import { UdpClientOpts } from './options';
import { defaultMaxSize } from '../consts';



@Injectable()
export class UdpClient extends Client<TransportRequest, TransportEvent, UdpClientOpts> {
    private socket?: Socket | null;
    private session?: ClientTransportSession | null;

    constructor(readonly handler: UdpHandler) {
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
            this.session = injector.get(ClientTransportSessionFactory).create(injector, this.socket, options.transportOpts!);
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
