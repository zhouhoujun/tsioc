import { tokenId } from '@tsdi/ioc';
import { CanActivate, Filter, Interceptor } from '@tsdi/core';
import { ServerOpts } from '@tsdi/endpoints';
import { RedisOptions } from 'ioredis';


export interface RedisServerOpts extends ServerOpts<RedisOptions> {
    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}


/**
 * Redis server interceptors.
 */
export const REDIS_SERV_INTERCEPTORS = tokenId<Interceptor[]>('REDIS_SERV_INTERCEPTORS');

/**
 * Redis server filters.
 */
export const REDIS_SERV_FILTERS = tokenId<Filter[]>('REDIS_SERV_FILTERS');

/**
 * REDIS Guards.
 */
export const REDIS_SERV_GUARDS = tokenId<CanActivate[]>('REDIS_SERV_GUARDS');

