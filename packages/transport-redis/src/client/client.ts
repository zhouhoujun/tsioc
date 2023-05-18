import { Inject, Injectable } from '@tsdi/ioc';
import { Client, Publisher, Subscriber, TransportEvent, TransportRequest } from '@tsdi/core';
import Redis, { RedisOptions } from 'ioredis';
import { RedisHandler } from './handler';
import { REDIS_CLIENT_OPTS, RedisClientOpts } from './options';



@Injectable({ static: false })
export class RedisClient extends Client<TransportRequest, TransportEvent>
    implements Subscriber, Publisher {

    private redis: Redis | null = null;
    constructor(
        readonly handler: RedisHandler,
        @Inject(REDIS_CLIENT_OPTS) private options: RedisClientOpts) {
        super();
    }

    protected async connect(): Promise<void> {
        if (this.redis) return;

        const opts = this.options;
        this.redis = new Redis(opts.connectOpts);
    }

    protected async onShutdown(): Promise<void> {
        await this.redis?.quit();
    }
}
