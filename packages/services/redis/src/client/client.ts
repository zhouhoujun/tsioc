import { Injectable, Context, isString } from '@tsdi/ioc';
import { LOCALHOST, Pattern, RequestInitOpts, ResponseEvent, TopicRequestOptions } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { ev } from '@tsdi/common/transport';
import { AbstractClient, ClientTransport, ClientTransportFactory } from '@tsdi/common/client';
import Redis from 'ioredis';
import { RedisHandler } from './handler';
import { RedisClientConfig } from './options';
import { RedisRequest } from './request';
import { ReidsSocket } from '../socket';

/**
 * Redis Client.
 */
@Injectable()
export class RedisClient extends AbstractClient<TopicRequestOptions, RedisRequest<any>, ResponseEvent<any>, RedisClientConfig> {

    @InjectLog()
    private logger!: Logger;

    private subscriber: Redis | null = null;
    private publisher: Redis | null = null;
    private _transport?: ClientTransport<ReidsSocket>;

    constructor(readonly handler: RedisHandler) {
        super();
    }

    protected async connect(): Promise<void> {
        if (this.subscriber) return;

        const opts = this.getOptions();

        const retryStrategy = opts.connectOpts?.retryStrategy ?? this.createRetryStrategy(opts);

        this.subscriber = opts.url ? new Redis(opts.url, {
            retryStrategy,
            ...opts.connectOpts,
            lazyConnect: true
        }) : new Redis({
            host: LOCALHOST,
            port: 6379,
            retryStrategy,
            ...opts.connectOpts,
            lazyConnect: true
        });
        this.subscriber.on(ev.ERROR, (err) => this.logger.error(err));

        this.publisher = opts.url ? new Redis(opts.url, {
            retryStrategy,
            ...opts.connectOpts,
            lazyConnect: true
        }) : new Redis({
            host: LOCALHOST,
            port: 6379,
            retryStrategy,
            ...opts.connectOpts,
            lazyConnect: true
        });
        this.publisher.on(ev.ERROR, (err) => this.logger.error(err));

        await this.subscriber.connect();
        await this.publisher.connect();

        this._transport = this.handler.injector.get(ClientTransportFactory).create(this.handler.injector, {
            subscriber: this.subscriber,
            publisher: this.publisher
        }, opts)

    }

    protected override initContext(context: Context): void {
        context.set(RedisClient, this);
        context.set(ClientTransport, this._transport);
    }

    protected createRequest(pattern: Pattern, options: RequestInitOpts<any, TopicRequestOptions>): RedisRequest<any> {
        return new RedisRequest(this.formatter.format(pattern), pattern, options);
    }


    protected createRetryStrategy(options: RedisClientConfig): (times: number) => undefined | number {
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
        if(!this.publisher || !this.subscriber) return;
        await this._transport?.destroy();
        await this.publisher?.quit();
        this.publisher?.removeAllListeners();
        await this.subscriber?.quit();
        this.subscriber?.removeAllListeners();

        this.publisher = this.subscriber = null;
    }
}
