import { Module } from '@tsdi/ioc';
import { NatsClient } from './client/client';
import { NatsServer } from './server/server';
import { NatsPatternFormatter } from './pattern';
import { NatsConfiguration } from './configuration';


@Module({
    providers: [
        NatsPatternFormatter,
        NatsConfiguration        
    ],
    declarations:[
        NatsClient,
        NatsServer,
    ]
})
export class NatsModule {

}
