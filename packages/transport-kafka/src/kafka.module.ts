import { RouterModule, TransformModule } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { KafkaClient } from './client/client';
import { KafkaServer } from './server/server';


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        KafkaClient,
        KafkaServer
    ]
})
export class KafkaModule {

}
