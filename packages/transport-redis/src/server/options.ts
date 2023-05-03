import { TransportContext, TransportEndpointOptions } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import Redis, { RedisOptions } from 'ioredis';


export interface RedisOpts extends TransportEndpointOptions<TransportContext> {
    connectOpts: RedisOptions;
}

export const REDIS_SERV_OPTS = tokenId<RedisOpts>('REDIS_SERV_OPTS');
