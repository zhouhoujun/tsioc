import { Client, TransportRequest } from '@tsdi/core';
import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { UdpHandler } from './handler';
import { UDP_CLIENT_OPTS, UdpClientOpts } from './options';
import { UdpTransportSession, UdpTransportSessionFactory } from '../transport';
import { defaultMaxSize } from '../const';



@Injectable({ static: false })
export class UdpClient extends Client<TransportRequest, number> {
    private socket?: Socket | null;
    private session?: UdpTransportSession | null;

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
            this.session = this.handler.injector.get(UdpTransportSessionFactory).create(this.socket, this.options.transportOpts!);
        }
    }

    protected async onShutdown(): Promise<void> {
        this.socket?.close();
        this.session?.destroy();
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(UdpTransportSession, this.session)
    }

}
