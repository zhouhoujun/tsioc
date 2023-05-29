import { Filter, Interceptor, TransportContext, TransportEndpointOptions, TransportRequest, TransportSessionOpts } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import Redis, { RedisOptions } from 'ioredis';


export interface RedisServerOpts extends TransportEndpointOptions<TransportContext> {
    connectOpts?: RedisOptions;
    detailError?: boolean;
    
    retryAttempts?: number;
    retryDelay?: number;
    transportOpts?: TransportSessionOpts;
}

export const REDIS_SERV_OPTS = tokenId<RedisServerOpts>('REDIS_SERV_OPTS');

/**
 * Redis server interceptors.
 */
export const REDIS_SERV_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransitionEvent>[]>('REDIS_SERV_INTERCEPTORS');

/**
 * Redis server filters.
 */
export const REDIS_SERV_FILTERS = tokenId<Filter[]>('REDIS_SERV_FILTERS');

