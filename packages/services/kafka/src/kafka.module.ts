import { Module } from '@tsdi/ioc';
import { KafkaClient } from './client/client';
import { KafkaServer } from './server/server';
import { KafkaPatternFormatter } from './pattern';
import { KafkaConfiguration } from './configuration';



@Module({
    providers: [
        KafkaPatternFormatter,
        KafkaConfiguration        
    ],
    declarations:[
        KafkaClient,
        KafkaServer,
    ]
})
export class KafkaModule {

}
