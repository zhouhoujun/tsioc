import { ConfigableHandlerOptions, Filter, Interceptor } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { TransportRequest, TransportEvent } from '@tsdi/common';
import { Client, TransportSessionOpts } from '@tsdi/transport';
import { RedisOptions } from 'ioredis';

/**
 * Redis client options.
 */
export interface RedisClientOpts extends ConfigableHandlerOptions<TransportRequest> {
    /**
     * connect options.
     */
    connectOpts?: RedisOptions;

    retryAttempts?: number;
    retryDelay?: number;
    transportOpts?: TransportSessionOpts;
    /**
     * request timeout.
     */
    timeout?: number;
}

/**
 * multi Redis client options.
 */
export interface RedisClientsOpts extends RedisClientOpts {
    /**
     * client token.
     */
    client: Token<Client>;
}

/**
 * REDIS client opptions.
 */
export const REDIS_CLIENT_OPTS = tokenId<RedisClientOpts>('REDIS_CLIENT_OPTS');
/**
 * REDIS client interceptors.
 */
export const REDIS_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('REDIS_CLIENT_INTERCEPTORS');
/**
 * REDIS client filters.
 */
export const REDIS_CLIENT_FILTERS = tokenId<Filter[]>('REDIS_CLIENT_FILTERS');
