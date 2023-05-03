import { ConfigableHandlerOptions, TransportEvent, TransportRequest } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import Redis, { RedisOptions } from 'ioredis';


export interface RedisClientOpts extends ConfigableHandlerOptions<TransportRequest, TransportEvent> {
    /**
     * connect options.
     */
    connectOpts: RedisOptions;
}

export const REDIS_CLIENT_OPTS = tokenId<RedisClientOpts>('REDIS_CLIENT_OPTS');
