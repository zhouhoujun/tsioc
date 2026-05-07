import { getTypeName, Inject, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    Events, createRequestContext, RequestContext, Transport
} from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import Redis from 'ioredis';
import { RedisServOptions, REDIS_SERV_OPTIONS, REDIS_BIND_INTERCEPTORS, REDIS_BIND_FILTERS, REDIS_BIND_GUARDS } from './options';

/**
 * Redis server for microservices.
 * Connects to Redis and subscribes to channels for message handling.
 */
@Injectable()
export class RedisServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    subscriber?: Redis | null;
    publisher?: Redis | null;

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(REDIS_SERV_OPTIONS, { nullable: true }) protected options: RedisServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: REDIS_BIND_INTERCEPTORS,
        filtersToken: REDIS_BIND_FILTERS,
        guardsToken: REDIS_BIND_GUARDS
    })
    async bind(_event: BindServiceEvent<any>) {
        if (this.subscriber) return;
        await this.onStart();
    }

    async onStart(): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        const redisOpts = this.options.connectOpts || {};
        this.subscriber = this.options.url ? new Redis(this.options.url, redisOpts as any) : new Redis(redisOpts as any);
        this.publisher = this.options.url ? new Redis(this.options.url, redisOpts as any) : new Redis(redisOpts as any);

        this.subscriber.on(Events.CONNECT, () => {
            this.logger.info(getTypeName(this), 'connected to Redis');

            const channels = this.options.channels || ['microservice'];
            const callback: any = (err: Error | null) => {
                if (err) {
                    this.logger.error('Failed to subscribe to Redis channels:', err);
                } else {
                    this.logger.info(`Subscribed to channel(s): ${channels.join(', ')}`);
                }
            };
            (this.subscriber as Redis).subscribe(...channels, callback);
        });

        this.subscriber.on(Events.MESSAGE, (channel: string, message: string) => {
            this.handleMessage(channel, message);
        });

        this.subscriber.on(Events.ERROR, (err: Error) => {
            this.logger.error('Redis subscriber error:', err);
        });

        this.publisher.on(Events.ERROR, (err: Error) => {
            this.logger.error('Redis publisher error:', err);
        });

        if (!this.options.microservice) {
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.subscriber, Transport.Redis, this));
        }
    }

    async onShutdown(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();

        if (this.subscriber) {
            await promisify(this.subscriber.quit.bind(this.subscriber))()
                .catch(err => this.logger.error('Redis subscriber quit error:', err));
            this.subscriber = null;
        }

        if (this.publisher) {
            await promisify(this.publisher.quit.bind(this.publisher))()
                .catch(err => this.logger.error('Redis publisher quit error:', err));
            this.publisher = null;
        }
    }

    private handleMessage(channel: string, message: string) {
        const context = createRequestContext(this.injector, [
            ['channel', channel],
            ['message', message],
        ]);

        let parsed: any;
        try {
            parsed = JSON.parse(message);
        } catch {
            parsed = message;
        }

        this.handler.handle(parsed as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe((response: any) => {
                if (response && this.publisher) {
                    const msg = typeof response === 'string' ? response : JSON.stringify(response);
                    this.publisher.publish(channel + ':response', msg);
                }
            });
    }
}
