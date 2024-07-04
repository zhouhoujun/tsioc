import { Injectable, InvocationContext } from '@tsdi/ioc';
import { LOCALHOST, Pattern, ResponseEvent, UrlRequestInitOpts } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { ev } from '@tsdi/common/transport';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import Redis from 'ioredis';
import { RedisHandler } from './handler';
import { RedisClientOpts } from './options';
import { ReidsTransport } from '../redis.session';
import { RedisRequest } from './request';

/**
 * Redis Client.
 */
@Injectable()
export class RedisClient extends Client<RedisRequest, ResponseEvent, RedisClientOpts> {

    @InjectLog()
    private logger!: Logger;

    private subscriber: Redis | null = null;
    private publisher: Redis | null = null;
    private _session?: ClientTransportSession<ReidsTransport>;

    constructor(readonly handler: RedisHandler) {
        super();
    }

    protected async connect(): Promise<void> {
        if (this.subscriber) return;

        const opts = this.getOptions();
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

        this._session = this.handler.injector.get(ClientTransportSessionFactory).create(this.handler.injector, {
            subscriber: this.subscriber,
            publisher: this.publisher
        }, opts)

    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(ClientTransportSession, this._session);
    }

    protected createRequest(pattern: Pattern, options: UrlRequestInitOpts<any>): RedisRequest<any> {
        return new RedisRequest(pattern, options);
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
