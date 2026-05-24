import { Module, token } from '@tsdi/ioc';
import { KafkaClient } from './client/client';
import { KafkaServer } from './server/kafka-server';
import { KafkaPatternFormatter } from './server/pattern';

export const KAFKA_SERV_INTERCEPTORS = token<any[]>('KAFKA_SERV_INTERCEPTORS');
export const KAFKA_SERV_FILTERS = token<any[]>('KAFKA_SERV_FILTERS');
export const KAFKA_SERV_GUARDS = token<any[]>('KAFKA_SERV_GUARDS');

@Module({
    providers: [
        KafkaPatternFormatter,
    ],
    declarations: [
        KafkaClient,
        KafkaServer
    ]
})
export class KafkaModule {

}
