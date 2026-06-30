import { getTypeName, Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    Events, createRequestContext, RequestContext, Transport, REQUEST
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent, getServiceRouterToken, getSubscribePatterns, mergeSubscribePatterns } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import Redis from 'ioredis';
import { RedisServOptions, REDIS_SERV_OPTIONS, REDIS_BIND_INTERCEPTORS, REDIS_BIND_FILTERS, REDIS_BIND_GUARDS } from './options';

@Injectable()
export class RedisServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    subscriber: Redis | null = null;
    patternSubscriber: Redis | null = null;
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
        this.patternSubscriber = new Redis(url);
        this.publisher = new Redis(url);

        const channels = this.resolveChannels();
        const directChannels = channels.filter(channel => !this.isPatternChannel(channel));
        const patternChannels = channels.filter(channel => this.isPatternChannel(channel));

        if (directChannels.length) {
            (this.subscriber as Redis).subscribe(...directChannels, (err: any) => {
                if (err) {
                    this.logger.error('Redis subscribe error:', err);
                } else {
                    this.logger.info(`Subscribed to channel(s): ${directChannels.join(', ')}`);
                }
            });
        }

        if (patternChannels.length) {
            (this.patternSubscriber as Redis).psubscribe(...patternChannels, (err: any) => {
                if (err) {
                    this.logger.error('Redis pattern subscribe error:', err);
                } else {
                    this.logger.info(`Subscribed to pattern channel(s): ${patternChannels.join(', ')}`);
                }
            });
        }

        this.subscriber.on(Events.MESSAGE, (channel: string, message: string) => {
            this.handleMessage(channel, message);
        });

        this.patternSubscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
            this.handleMessage(channel, message);
        });

        this.subscriber.on(Events.ERROR, (err: Error) => {
            this.logger.error('Redis subscriber error:', err);
        });

        this.patternSubscriber.on(Events.ERROR, (err: Error) => {
            this.logger.error('Redis pattern subscriber error:', err);
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
            await this.closeRedisClient(this.subscriber);
            this.subscriber = null;
        }

        if (this.patternSubscriber) {
            await this.closeRedisClient(this.patternSubscriber);
            this.patternSubscriber = null;
        }

        if (this.publisher) {
            await this.closeRedisClient(this.publisher);
            this.publisher = null;
        }
    }

    private resolveChannels(): string[] {
        return mergeSubscribePatterns(
            this.options.channels,
            [
                ...getSubscribePatterns(this.options, this.injector),
                ...this.resolveHandleChannels()
            ],
            ['microservice.*']
        );
    }

    private handleMessage(channel: string, message: string) {
        const context = createRequestContext(this.injector, [
            [REQUEST, { channel, message }],
        ]);

        this.handler.handle({ channel, message } as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe({
                error: (err) => {
                    this.logger.error('Redis request handling error:', err);
                }
            });
    }

    private resolveHandleChannels(): string[] {
        const router = this.injector.get(getServiceRouterToken(this.options), null as any);
        if (!router?.routes?.length) {
            return [];
        }
        const seen = new Set<string>();
        return router.routes
            .filter((route: any) => !route?.method && typeof route?.path === 'string')
            .map((route: any) => route.path as string)
            .filter((path: string) => {
                if (!path || seen.has(path)) {
                    return false;
                }
                seen.add(path);
                return true;
            });
    }

    private isPatternChannel(channel: string): boolean {
        return channel.includes('*') || channel.includes('?');
    }

    private async closeRedisClient(client: Redis): Promise<void> {
        await new Promise<void>((resolve) => {
            let settled = false;
            let timeout: NodeJS.Timeout | undefined;
            const finish = () => {
                if (settled) {
                    return;
                }
                settled = true;
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = undefined;
                }
                client.removeAllListeners();
                resolve();
            };

            client.once(Events.CLOSE, finish);

            Promise.resolve(client.quit()).catch(() => {
                client.disconnect();
                finish();
            });
            timeout = setTimeout(() => {
                try {
                    client.disconnect();
                } finally {
                    finish();
                }
            }, 1000);
            if (typeof (timeout as any).unref === 'function') {
                (timeout as any).unref();
            }
        });
    }
}
