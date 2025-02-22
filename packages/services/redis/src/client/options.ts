import { tokenId } from '@tsdi/ioc';
import { Filter, Interceptor } from '@tsdi/core';
import { ResponseEvent } from '@tsdi/common';
import { ClientConfig } from '@tsdi/common/client';
import { RedisOptions } from 'ioredis';
import { RedisRequest } from './request';

/**
 * Redis client options.
 */
export interface RedisClientConfig extends ClientConfig<RedisOptions> {

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
export const REDIS_CLIENT_INTERCEPTORS = tokenId<Interceptor<RedisRequest<any>, ResponseEvent<any>>[]>('REDIS_CLIENT_INTERCEPTORS');
/**
 * REDIS client filters.
 */
export const REDIS_CLIENT_FILTERS = tokenId<Filter[]>('REDIS_CLIENT_FILTERS');
