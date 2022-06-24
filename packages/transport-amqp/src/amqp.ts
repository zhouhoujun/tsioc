
import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { AmqpClient } from './client/client';
import { AmqpServer } from './server/server';


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        AmqpClient,
        AmqpServer
    ]
})
export class AMQPModule {

}
