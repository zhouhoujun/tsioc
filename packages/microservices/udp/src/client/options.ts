import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';
import { SocketType } from 'node:dgram';

export interface UdpClientOptions extends ClientOptions {
    transport: Transport.UDP;
    side: TransferSide.client;
    microservice?: boolean;
    port?: number;
    host?: string;
    socketType?: SocketType;
}

export const UDP_CLIENT_OPTIONS = token<UdpClientOptions>('UDP_CLIENT_OPTIONS');
