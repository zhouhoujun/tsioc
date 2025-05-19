import { Module } from '@tsdi/ioc';
import { AmqpClient } from './client/client';
import { AmqpServer } from './server/server';
import { AmqpConfiguration } from './configuration';



@Module({
    providers: [
        AmqpConfiguration
    ],
    declarations:[
        AmqpClient,
        AmqpServer
    ]
})
export class AmqpModule {

}