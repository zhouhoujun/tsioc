import { token, Provider } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { ConsumerIdempotencyOptions, ServiceOptions, ConsumerRetryOptions } from '@tsdi/service';

export interface NatsServOptions extends ServiceOptions {
    transport: Transport.NATS;
    providers?: Provider[];
    url?: string;
    servers?: string[];
    subjects?: string[];
    queue?: string;
    /**
     * in-process retry before a failed delivery is dropped/dead-lettered.
     * Core NATS is at-most-once; JetStream acks are outside this server.
     */
    retry?: ConsumerRetryOptions;
    /**
     * subject that receives deliveries which exhausted their retry budget.
     */
    deadLetterSubject?: string;
    /**
     * maximum concurrent handlers. default unlimited.
     */
    concurrency?: number;
    /**
     * delivery mode. `core` (default) is at-most-once; `jetstream` uses a
     * durable JetStream consumer with explicit ack/nak and redelivery.
     *
     * Request/response still uses core NATS reply inboxes in jetstream mode.
     */
    delivery?: 'core' | 'jetstream';
    /** JetStream stream name, created when missing. Default `TSDI`. */
    stream?: string;
    /** subjects captured by the stream. Default derived from subscriptions. */
    streamSubjects?: string[];
    /** durable consumer name. Default `queue` or `tsdi`. */
    durable?: string;
    /** consumer filter subject. Default the first configured subject. */
    jetstreamSubject?: string;
    /** ack wait in milliseconds. Default 30000. */
    ackWaitMs?: number;
    /** maximum deliveries before DLQ/term. Default 5. */
    maxDeliver?: number;
    /** deduplicate redeliveries by stream sequence. */
    idempotency?: ConsumerIdempotencyOptions;
}

export const NATS_SERV_OPTIONS = token<NatsServOptions>('NATS_SERV_OPTIONS');
export const NATS_BIND_INTERCEPTORS = token<any[]>('NATS_BIND_INTERCEPTORS');
export const NATS_BIND_FILTERS = token<any[]>('NATS_BIND_FILTERS');
export const NATS_BIND_GUARDS = token<any[]>('NATS_BIND_GUARDS');
