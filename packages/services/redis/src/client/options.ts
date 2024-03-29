import { tokenId } from '@tsdi/ioc';
import { Filter, Interceptor } from '@tsdi/core';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { ClientOpts } from '@tsdi/common/client';
import { RedisOptions } from 'ioredis';

/**
 * Redis client options.
 */
export interface RedisClientOpts extends ClientOpts<RedisOptions> {

    retryAttempts?: number;
    retryDelay?: number;
    /**
     * request timeout.
     */
    timeout?: number;
}


/**
 * REDIS client interceptors.
 */
export const REDIS_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('REDIS_CLIENT_INTERCEPTORS');
/**
 * REDIS client filters.
 */
export const REDIS_CLIENT_FILTERS = tokenId<Filter[]>('REDIS_CLIENT_FILTERS');
