import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';
import { ChannelCredentials } from '@grpc/grpc-js';

export interface GrpcClientOptions extends ClientOptions {
    transport: Transport.gRPC;
    side: TransferSide.client;
    microservice?: boolean;
    url?: string;
    credentials?: ChannelCredentials;
}

export const GRPC_CLIENT_OPTIONS = token<GrpcClientOptions>('GRPC_CLIENT_OPTIONS');
