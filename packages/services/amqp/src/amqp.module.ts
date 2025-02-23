import { Module } from '@tsdi/ioc';
import { AmqpClient } from './client/client';
import { AmqpServer } from './server/server';
import { AmqpConfiguration } from './configuration';



@Module({
    providers: [
        AmqpClient,
        AmqpServer,
        AmqpConfiguration
    ]
})
export class AmqpModule {

}