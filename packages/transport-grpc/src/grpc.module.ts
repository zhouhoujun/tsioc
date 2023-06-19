import { RouterModule, TransformModule } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { GrpcClient } from './client/client';
import { GrpcServer } from './server/server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        GrpcClient,
        GrpcServer
    ]
})
export class GrpcModule {

}
