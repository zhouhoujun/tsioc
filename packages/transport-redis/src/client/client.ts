import { Inject, Injectable } from '@tsdi/ioc';
import { Client, ClientSubscribeCallback, PacketCallback, Publisher, Subscriber, TransportEvent, TransportRequest } from '@tsdi/core';
import Redis, { RedisOptions } from 'ioredis';
import { RedisHandler } from './handler';
import { REDIS_CLIENT_OPTS, RedisClientOpts } from './options';
import { LOCALHOST } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logs';



@Injectable({ static: false })
export class RedisClient extends Client<TransportRequest, TransportEvent> {

    @InjectLog()
    private logger!: Logger;

    private redis: Redis | null = null;
    constructor(
        readonly handler: RedisHandler,
        @Inject(REDIS_CLIENT_OPTS) private options: RedisClientOpts) {
        super();
    }

    protected async connect(): Promise<void> {
        if (this.redis) return;

        const opts = this.options;
        const retryStrategy = opts.connectOpts?.retryStrategy ?? this.createRetryStrategy(opts);
        this.redis = new Redis({
            host: LOCALHOST,
            port: 6379,
            retryStrategy,
            ...opts.connectOpts
        });
        await this.redis.connect();
    }

    protected createRetryStrategy(options: RedisClientOpts): (times: number) => undefined | number {
        return (times: number) => {
            const retryAttempts = options.retryAttempts;
            if (!retryAttempts || times > retryAttempts) {
                this.logger.error('Retry time exhausted');
                return;
            }

            return options.retryDelay ?? 0;
        }
    }

    protected async onShutdown(): Promise<void> {
        await this.redis?.quit();
    }
}
