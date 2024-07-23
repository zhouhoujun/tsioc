import { Module } from '@tsdi/ioc';
import { WsClient } from './client/client';
import { WsServer } from './server/server';
import { WsConfiguration } from './configuration';



@Module({
    providers: [
        WsClient,
        WsServer,
        WsConfiguration
    ]
})
export class WsModule {

}
