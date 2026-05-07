import { token, Provider } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';

export interface AmqpServOptions extends ServiceOptions {
    transport: Transport.AMQP;
    providers?: Provider[];
    url?: string;
    exchange?: string;
    exchangeType?: 'direct' | 'topic' | 'fanout' | 'headers';
    routingKey?: string;
    queue?: string;
    prefetch?: number;
}

export const AMQP_SERV_OPTIONS = token<AmqpServOptions>('AMQP_SERV_OPTIONS');
export const AMQP_BIND_INTERCEPTORS = token<any[]>('AMQP_BIND_INTERCEPTORS');
export const AMQP_BIND_FILTERS = token<any[]>('AMQP_BIND_FILTERS');
export const AMQP_BIND_GUARDS = token<any[]>('AMQP_BIND_GUARDS');
