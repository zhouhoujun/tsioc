import { Abstract } from '@tsdi/ioc';
import { TransportClientOpts } from '@tsdi/transport';
import { RedisClientOptions } from 'redis';

@Abstract()
export abstract class RedisClientOpts extends TransportClientOpts {
    abstract redisOpts: RedisClientOptions;
}
