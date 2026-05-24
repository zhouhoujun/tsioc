import { Module, token } from '@tsdi/ioc';
import { NatsClient } from './client/client';
import { NatsServer } from './server/nats-server';
import { NatsPatternFormatter } from './server/pattern';

export const NATS_SERV_INTERCEPTORS = token<any[]>('NATS_SERV_INTERCEPTORS');
export const NATS_SERV_FILTERS = token<any[]>('NATS_SERV_FILTERS');
export const NATS_SERV_GUARDS = token<any[]>('NATS_SERV_GUARDS');

@Module({
    providers: [
        NatsPatternFormatter,
    ],
    declarations: [
        NatsClient,
        NatsServer
    ]
})
export class NatsModule {

}
