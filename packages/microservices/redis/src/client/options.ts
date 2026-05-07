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
}

export const REDIS_CLIENT_OPTIONS = token<RedisClientOptions>('REDIS_CLIENT_OPTIONS');
