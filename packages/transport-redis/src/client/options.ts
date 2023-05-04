import { ConfigableHandlerOptions, TransportRequest } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import Redis, { RedisOptions } from 'ioredis';

/**
 * Redis client options.
 */
export interface RedisClientOpts extends ConfigableHandlerOptions<TransportRequest> {
    /**
     * connect options.
     */
    connectOpts: RedisOptions;
}

export const REDIS_CLIENT_OPTS = tokenId<RedisClientOpts>('REDIS_CLIENT_OPTS');
