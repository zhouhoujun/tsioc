import { token, Provider } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';

export interface AmqpRetryOptions {
    /**
     * maximum delivery attempts after the first failure. `0` disables the
     * application-level retry (broker DLX semantics are preserved). default 0.
     */
    maxAttempts?: number;
    /**
     * delay in milliseconds before a failed message is redelivered.
     * default 1000, implemented with a per-queue TTL retry queue.
     */
    delayMs?: number;
}

export interface AmqpServOptions extends ServiceOptions {
    transport: Transport.AMQP;
    providers?: Provider[];
    url?: string;
    exchange?: string;
    exchangeType?: 'direct' | 'topic' | 'fanout' | 'headers';
    routingKey?: string;
    queue?: string;
    prefetch?: number;
    /**
     * application-level retry for failed deliveries.
     */
    retry?: AmqpRetryOptions;
    /**
     * exchange to publish messages that exhausted their retry budget.
     */
    deadLetterExchange?: string;
    /**
     * routing key used with `deadLetterExchange`. default: original routing key.
     */
    deadLetterRoutingKey?: string;
    /**
     * queue that receives exhausted messages (declared durable when the main
     * queue is durable). used when `deadLetterExchange` is not set.
     */
    deadLetterQueue?: string;
}

export const AMQP_SERV_OPTIONS = token<AmqpServOptions>('AMQP_SERV_OPTIONS');
export const AMQP_BIND_INTERCEPTORS = token<any[]>('AMQP_BIND_INTERCEPTORS');
export const AMQP_BIND_FILTERS = token<any[]>('AMQP_BIND_FILTERS');
export const AMQP_BIND_GUARDS = token<any[]>('AMQP_BIND_GUARDS');
