import { Injectable, InvocationContext, isString } from '@tsdi/ioc';
import { LOCALHOST, Pattern, RequestInitOpts, ResponseEvent } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { ev } from '@tsdi/common/transport';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import Redis from 'ioredis';
import { RedisHandler } from './handler';
import { RedisClientOpts } from './options';
import { RedisRequest } from './request';
import { ReidsSocket } from '../message';

/**
 * Redis Client.
 */
@Injectable()
export class RedisClient extends Client<RedisRequest<any>, ResponseEvent<any>, RedisClientOpts> {

    @InjectLog()
    private logger!: Logger;

    private subscriber: Redis | null = null;
    private publisher: Redis | null = null;
    private _session?: ClientTransportSession<ReidsSocket>;

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

    protected createRequest(pattern: Pattern, options: RequestInitOpts<any>): RedisRequest<any> {
        if (isString(pattern)) {
            return new RedisRequest(pattern, null, options);
        }
        return new RedisRequest(this.formatter.format(pattern), pattern, options);
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
        this.publisher?.quit();
        this.publisher?.removeAllListeners();
        this.subscriber?.quit();
        this.subscriber?.removeAllListeners();

        this.publisher = this.subscriber = null;
    }
}
