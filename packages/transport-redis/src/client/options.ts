import { ClientOpts, RequestPacket, ResponseEvent } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { RedisClientOptions } from 'redis';

@Abstract()
export abstract class RedisClientOpts extends ClientOpts<RequestPacket, ResponseEvent> {
    abstract redisOpts: RedisClientOptions;
}
