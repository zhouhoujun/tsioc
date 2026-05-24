import { Module, token } from '@tsdi/ioc';
import { GrpcClient } from './client/client';
import { GrpcServer } from './server/grpc-server';

export const GRPC_SERV_INTERCEPTORS = token<any[]>('GRPC_SERV_INTERCEPTORS');
export const GRPC_SERV_FILTERS = token<any[]>('GRPC_SERV_FILTERS');
export const GRPC_SERV_GUARDS = token<any[]>('GRPC_SERV_GUARDS');

@Module({
    providers: [],
    declarations: [
        GrpcClient,
        GrpcServer
    ]
})
export class GrpcModule {

}
