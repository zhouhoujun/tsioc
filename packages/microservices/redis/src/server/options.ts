import { token, Provider } from '@tsdi/ioc';
import { Transport } from '@tsdi/common';
import { ConsumerIdempotencyOptions, ConsumerRetryOptions, ServiceOptions } from '@tsdi/service';
import { RedisOptions } from 'ioredis';

export interface RedisServOptions extends ServiceOptions {
    transport: Transport.Redis;
    providers?: Provider[];
    url?: string;
    connectOpts?: RedisOptions;
    channels?: string[];
    responseChannelSuffix?: string;
    /**
     * delivery mode for microservice events. `pubsub` (default) is
     * at-most-once; `stream` consumes a Redis Stream consumer group with
     * explicit XACK and XAUTOCLAIM reclaim.
     *
     * Request/response still uses pub/sub reply channels in stream mode.
     */
    delivery?: 'pubsub' | 'stream';
    /** stream key used by `delivery: 'stream'`. Default `tsdi:stream`. */
    streamKey?: string;
    /** consumer group used by `delivery: 'stream'`. Default `tsdi`. */
    group?: string;
    /** consumer name used by `delivery: 'stream'`. Default host-pid-random. */
    consumer?: string;
    /** XREADGROUP block time in milliseconds. Default 2000. */
    blockMs?: number;
    /** idle time before reclaiming pending entries. Default 60000. */
    claimIdleMs?: number;
    /** in-process retry policy for stream deliveries. */
    retry?: ConsumerRetryOptions;
    /** concurrent stream handlers. Default unlimited. */
    concurrency?: number;
    /** opt-in deduplication for reclaimed/duplicate stream ids. */
    idempotency?: ConsumerIdempotencyOptions;
}

export const REDIS_SERV_OPTIONS = token<RedisServOptions>('REDIS_SERV_OPTIONS');
export const REDIS_BIND_INTERCEPTORS = token<any[]>('REDIS_BIND_INTERCEPTORS');
export const REDIS_BIND_FILTERS = token<any[]>('REDIS_BIND_FILTERS');
export const REDIS_BIND_GUARDS = token<any[]>('REDIS_BIND_GUARDS');
