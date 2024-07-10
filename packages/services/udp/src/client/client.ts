import { Injectable, InvocationContext, isString } from '@tsdi/ioc';
import { Pattern, ResponseEvent } from '@tsdi/common';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { UdpHandler } from './handler';
import { UdpClientOpts } from './options';
import { defaultMaxSize } from '../consts';
import { UdpRequest, UdpRequestInitOpts } from './request';



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

    protected createRequest(pattern: Pattern, options: UdpRequestInitOpts<any>): UdpRequest<any> {
        options.baseUrl = this.getOptions().url;
        if (isString(pattern)) {
            return new UdpRequest(pattern, null, options);
        } else {
            return new UdpRequest(this.formatter.format(pattern), pattern, options);
        }
    }

}
