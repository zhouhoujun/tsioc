import { Module, RouterModule, TransformModule } from '@tsdi/core';
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
