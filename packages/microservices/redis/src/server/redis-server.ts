import { getTypeName, Inject, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    Events, createRequestContext, RequestContext, Transport, REQUEST
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import Redis from 'ioredis';
import { RedisServOptions, REDIS_SERV_OPTIONS, REDIS_BIND_INTERCEPTORS, REDIS_BIND_FILTERS, REDIS_BIND_GUARDS } from './options';
import { RedisMessageAdapter } from './message-adapter';
import { RedisMessageAdapterFactory } from './message-adapter.factory';

@Injectable()
export class RedisServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    subscriber: Redis | null = null;
    publisher: Redis | null = null;

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

        const url = this.options.url || 'redis://127.0.0.1:6379';
        this.subscriber = new Redis(url);
        this.publisher = new Redis(url);

        const channels = this.options.channels || ['microservice.*'];
        (this.subscriber as Redis).subscribe(...channels, (err: any) => {
            if (err) {
                this.logger.error('Redis subscribe error:', err);
            } else {
                this.logger.info(`Subscribed to channel(s): ${channels.join(', ')}`);
            }
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
        let parsed: any;
        try {
            parsed = JSON.parse(message);
        } catch {
            parsed = message;
        }

        const url = parsed.url || channel;
        const method = parsed.method || 'GET';
        const requestData = { ...parsed, url, method };

        const context = createRequestContext(this.injector, [
            [REQUEST, requestData],
        ]);
        const adapter = this.injector.get(RedisMessageAdapterFactory).create({ request: requestData, response: this.publisher!, context });
        context.setMessageAdapter(adapter);
        context.setPayload(requestData);

        this.handler.handle(requestData as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe((response: any) => {
                if (this.publisher) {
                    const body = adapter.getBody() ?? response === adapter ? undefined : response;
                    const msg = typeof body === 'string' ? body : JSON.stringify(body);
                    this.publisher.publish(channel + ':response', msg);
                }
            });
    }
}
