import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';
import { RedisOptions } from 'ioredis';

export interface RedisClientOptions extends ClientOptions {
    transport: Transport.Redis;
    side: TransferSide.client;
    microservice?: boolean;
    url?: string;
    connectOpts?: RedisOptions;
    responseChannelSuffix?: string;
    /**
     * `stream` publishes `observe: 'events'` messages with XADD instead of
     * PUBLISH. Request/response stays on pub/sub. Must match the server mode
     * and `streamKey`.
     */
    delivery?: 'pubsub' | 'stream';
    /** stream key used by `delivery: 'stream'`. Default `tsdi:stream`. */
    streamKey?: string;
}

export const REDIS_CLIENT_OPTIONS = token<RedisClientOptions>('REDIS_CLIENT_OPTIONS');
