import { token, Provider } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { ServiceOptions, ConsumerRetryOptions } from '@tsdi/service';

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
}

export const NATS_SERV_OPTIONS = token<NatsServOptions>('NATS_SERV_OPTIONS');
export const NATS_BIND_INTERCEPTORS = token<any[]>('NATS_BIND_INTERCEPTORS');
export const NATS_BIND_FILTERS = token<any[]>('NATS_BIND_FILTERS');
export const NATS_BIND_GUARDS = token<any[]>('NATS_BIND_GUARDS');
