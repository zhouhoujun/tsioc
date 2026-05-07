import { token, Provider } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';
import { ServerCredentials } from '@grpc/grpc-js';

export interface GrpcServOptions extends ServiceOptions {
    transport: Transport.gRPC;
    providers?: Provider[];
    url?: string;
    port?: number;
    credentials?: ServerCredentials;
    protoPath?: string;
    packageName?: string;
    serviceName?: string;
}

export const GRPC_SERV_OPTIONS = token<GrpcServOptions>('GRPC_SERV_OPTIONS');
export const GRPC_BIND_INTERCEPTORS = token<any[]>('GRPC_BIND_INTERCEPTORS');
export const GRPC_BIND_FILTERS = token<any[]>('GRPC_BIND_FILTERS');
export const GRPC_BIND_GUARDS = token<any[]>('GRPC_BIND_GUARDS');
