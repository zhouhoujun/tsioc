import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { LOCALHOST, TransportRequest } from '@tsdi/common';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import Redis from 'ioredis';
import { RedisHandler } from './handler';
import { REDIS_CLIENT_OPTS, RedisClientOpts } from './options';
import { RedisTransportSessionFactory, ReidsTransport } from '../redis.session';
import { ev } from '@tsdi/common/transport';

/**
 * Redis Client.
 */
@Injectable()
export class RedisClient extends Client<TransportRequest> {

    @InjectLog()
    private logger!: Logger;

    private subscriber: Redis | null = null;
    private publisher: Redis | null = null;
    private _session?: ClientTransportSession<ReidsTransport>;

    constructor(
        readonly handler: RedisHandler,
        @Inject(REDIS_CLIENT_OPTS) private options: RedisClientOpts) {
        super();
    }

    protected async connect(): Promise<void> {
        if (this.subscriber) return;

        const opts = this.options;
        const retryStrategy = opts.connectOpts?.retryStrategy ?? this.createRetryStrategy(opts);
        this.subscriber = new Redis({
            host: LOCALHOST,
            port: 6379,
            retryStrategy,
            ...opts.connectOpts,
            lazyConnect: true
        });
        this.subscriber.on(ev.ERROR, (err) => this.logger.error(err));

        this.publisher = new Redis({
            host: LOCALHOST,
            port: 6379,
            retryStrategy,
            ...opts.connectOpts,
            lazyConnect: true
        });
        this.publisher.on(ev.ERROR, (err) => this.logger.error(err));

        await Promise.all([
            this.subscriber.connect(),
            this.publisher.connect()
        ]);

        const transportOpts =  opts.transportOpts!;
        if(!transportOpts.transport) {
            transportOpts.transport = 'redis';
        }

        this._session = this.handler.injector.get(ClientTransportSessionFactory).create(this.handler.injector, {
            subscriber: this.subscriber,
            publisher: this.publisher
        }, transportOpts)

    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(ClientTransportSession, this._session);
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
        await this._session?.destroy();
        this.publisher = this.subscriber = null;
    }
}
