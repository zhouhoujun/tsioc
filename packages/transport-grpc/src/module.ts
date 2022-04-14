import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { GrpcClient } from './client';
import { GrpcServer } from './server';

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
