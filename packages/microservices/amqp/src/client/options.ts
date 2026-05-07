import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';

export interface AmqpClientOptions extends ClientOptions {
    transport: Transport.AMQP;
    side: TransferSide.client;
    microservice?: boolean;
    url?: string;
    exchange?: string;
    exchangeType?: 'direct' | 'topic' | 'fanout' | 'headers';
    routingKey?: string;
}

export const AMQP_CLIENT_OPTIONS = token<AmqpClientOptions>('AMQP_CLIENT_OPTIONS');
