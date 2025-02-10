import { Module } from '@tsdi/ioc';
import { NatsClient } from './client/client';
import { NatsServer } from './server/server';
import { NatsPatternFormatter } from './pattern';
import { NatsConfiguration } from './configuration';


@Module({
    providers: [
        NatsClient,
        NatsServer,
        NatsPatternFormatter,
        NatsConfiguration        
    ]
})
export class NatsModule {

}
