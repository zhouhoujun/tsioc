import { Injectable, Context, isString, promisify } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, ResponseEvent } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { AbstractClient, ClientTransport, ClientTransportFactory } from '@tsdi/common/client';
import { Socket, createSocket, SocketOptions } from 'node:dgram';
import { UdpHandler } from './handler';
import { UdpClientConfig } from './options';
import { sizeLimit } from '../consts';
import { UdpRequest, UdpRequestOptions } from './request';



@Injectable()
export class UdpClient extends AbstractClient<UdpRequestOptions, UdpRequest<any>, ResponseEvent<any>, UdpClientConfig> {
    @InjectLog()
    private logger!: Logger;
    
    private socket?: Socket | null;
    private session?: ClientTransport | null;

    constructor(readonly handler: UdpHandler) {
        super();
    }

    protected async connect(): Promise<any> {
        if (!this.session) {
            const options = this.getOptions();
            const connectOpts = {
                type: 'udp4',
                sendBufferSize: options.transportOpts?.limit ?? sizeLimit,
                ...options.connectOpts
            } as SocketOptions;
            this.socket = createSocket(connectOpts);

            const context = this.handler.context;
            this.session = context.get(ClientTransportFactory).create(context, this.socket, options);
        }
    }

    protected async onShutdown(): Promise<void> {
        if (!this.socket) return;
        await this.session?.destroy();
        await promisify(this.socket.close, this.socket)()
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
    
    }

    protected initContext(context: Context): void {
        context.set(UdpClient, this);
        context.set(ClientTransport, this.session)
    }

    protected createRequest(pattern: Pattern, options: RequestInitOpts<any, UdpRequestOptions>): UdpRequest<any> {
        options.baseUrl = this.getOptions().url;
        if (isString(pattern)) {
            return new UdpRequest(pattern, null, options);
        } else {
            return new UdpRequest(this.formatter.format(pattern), pattern, options);
        }
    }

}
