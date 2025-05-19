import { Module } from '@tsdi/ioc';
import { KafkaClient } from './client/client';
import { KafkaServer } from './server/server';
import { KafkaPatternFormatter, KafkaRouteMatcher } from './pattern';
import { KafkaConfiguration } from './configuration';



@Module({
    providers: [
        KafkaPatternFormatter,
        KafkaRouteMatcher,
        KafkaConfiguration        
    ],
    declarations:[
        KafkaClient,
        KafkaServer,
    ]
})
export class KafkaModule {

}
