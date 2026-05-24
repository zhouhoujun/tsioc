import { Module, token } from '@tsdi/ioc';
import { AmqpClient } from './client/client';
import { AmqpServer } from './server/amqp-server';
import { AmqpPatternFormatter } from './server/pattern';

export const AMQP_SERV_INTERCEPTORS = token<any[]>('AMQP_SERV_INTERCEPTORS');
export const AMQP_SERV_FILTERS = token<any[]>('AMQP_SERV_FILTERS');
export const AMQP_SERV_GUARDS = token<any[]>('AMQP_SERV_GUARDS');

@Module({
    providers: [
        AmqpPatternFormatter,
    ],
    declarations: [
        AmqpClient,
        AmqpServer
    ]
})
export class AmqpModule {

}
