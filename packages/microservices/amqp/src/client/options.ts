import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';

export interface AmqpClientOptions extends ClientOptions {
    transport: Transport.AMQP;
    side: TransferSide.client;
    microservice?: boolean;
    url?: string;
    /**
     * AMQP frame size. Newer RabbitMQ versions require >= 8192.
     * Default 16384.
     */
    frameMax?: number;
    exchange?: string;
    exchangeType?: 'direct' | 'topic' | 'fanout' | 'headers';
    routingKey?: string;
}

export const AMQP_CLIENT_OPTIONS = token<AmqpClientOptions>('AMQP_CLIENT_OPTIONS');
