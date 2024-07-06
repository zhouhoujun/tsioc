import { Injectable, InvocationContext } from '@tsdi/ioc';
import { Pattern, ResponseEvent, UrlRequestInitOpts } from '@tsdi/common';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { UdpHandler } from './handler';
import { UdpClientOpts } from './options';
import { defaultMaxSize } from '../consts';
import { UdpRequest } from './request';



@Injectable()
export class UdpClient extends Client<UdpRequest<any>, ResponseEvent<any>, UdpClientOpts> {
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

            const injector = this.handler.injector;
            this.session = injector.get(ClientTransportSessionFactory).create(injector, this.socket, options);
        }
    }

    protected async onShutdown(): Promise<void> {
        this.socket?.close();
        this.session?.destroy();
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(UdpClient, this);
        context.setValue(ClientTransportSession, this.session)
    }

    protected createRequest(pattern: Pattern, options: UrlRequestInitOpts<any>): UdpRequest<any> {
        return new UdpRequest({ pattern, baseUrl: this.getOptions().url, ...options });
    }

}
