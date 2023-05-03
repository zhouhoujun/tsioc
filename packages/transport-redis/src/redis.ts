import { Module } from '@tsdi/ioc';
import { RouterModule, TransformModule } from '@tsdi/core';
import { RedisClient } from './client/client';
import { RedisServer } from './server/server';


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        RedisClient,
        RedisServer
    ]
})
export class RedisModule {

}
