import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { WsClient } from './client/client';
import { WsServer } from './server/server';


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        WsClient,
        WsServer
    ]
})
export class WsModule {

}
