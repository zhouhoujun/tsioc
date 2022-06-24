import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { NatsClient } from './client/client';
import { NatsServer } from './server/server';


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        NatsClient,
        NatsServer
    ]
})
export class NatsModule {

}
