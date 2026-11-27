import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    Events, createRequestContext, RequestContext, Transport, REQUEST
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent, getServiceRouterToken, getSubscribePatterns, mergeSubscribePatterns, watchSubscribePatterns, ConsumerRuntime, ConsumerMetricsSink, CONSUMER_METRICS } from '@tsdi/service';
import { Subject, lastValueFrom, race, take, takeUntil } from 'rxjs';
import { hostname } from 'node:os';
import Redis from 'ioredis';
import { RedisIdempotencyStore } from '../idempotency.store';
import { RedisServOptions, REDIS_SERV_OPTIONS, REDIS_BIND_INTERCEPTORS, REDIS_BIND_FILTERS, REDIS_BIND_GUARDS } from './options';

@Injectable()
export class RedisServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    subscriber: Redis | null = null;
    patternSubscriber: Redis | null = null;
    publisher: Redis | null = null;

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;
    private stopRouteWatch?: () => void;
    private directChannels = new Set<string>();
    private patternChannels = new Set<string>();
    private streamClient?: Redis;
    private streamLoop?: Promise<void>;
    private streamStopping = false;
    private runtime?: ConsumerRuntime;
    private redisIdempotency?: RedisIdempotencyStore;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(REDIS_SERV_OPTIONS, { nullable: true }) protected options: RedisServOptions,
        @Inject(CONSUMER_METRICS, { nullable: true }) protected consumerMetrics?: ConsumerMetricsSink | null,
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
        this.directChannels = new Set(directChannels);
        this.patternChannels = new Set(patternChannels);
        this.stopRouteWatch = watchSubscribePatterns(this.options, this.injector, () => {
            this.reconcileChannels();
        });

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

        if (this.options.delivery === 'stream') {
            await this.startStreamConsumer(url);
        }

        if (!this.options.microservice) {
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.subscriber, Transport.Redis, this));
        }
    }

    async onShutdown(): Promise<void> {
        this.stopRouteWatch?.();
        this.stopRouteWatch = undefined;
        this.directChannels.clear();
        this.patternChannels.clear();
        await this.stopStreamConsumer();
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

    private reconcileChannels(): void {
        const subscriber = this.subscriber as Redis;
        const patternSubscriber = this.patternSubscriber as Redis;
        if (!subscriber || !patternSubscriber) {
            return;
        }
        const channels = this.resolveChannels();
        const nextDirect = new Set(channels.filter(channel => !this.isPatternChannel(channel)));
        const nextPattern = new Set(channels.filter(channel => this.isPatternChannel(channel)));

        const addedDirect = [...nextDirect].filter(channel => !this.directChannels.has(channel));
        const removedDirect = [...this.directChannels].filter(channel => !nextDirect.has(channel));
        if (addedDirect.length) {
            subscriber.subscribe(...addedDirect, (err: any) => {
                if (err) this.logger.error('Redis subscribe error:', err);
            });
        }
        if (removedDirect.length) {
            subscriber.unsubscribe(...removedDirect, (err: any) => {
                if (err) this.logger.error('Redis unsubscribe error:', err);
            });
        }

        const addedPattern = [...nextPattern].filter(channel => !this.patternChannels.has(channel));
        const removedPattern = [...this.patternChannels].filter(channel => !nextPattern.has(channel));
        if (addedPattern.length) {
            patternSubscriber.psubscribe(...addedPattern, (err: any) => {
                if (err) this.logger.error('Redis pattern subscribe error:', err);
            });
        }
        if (removedPattern.length) {
            patternSubscriber.punsubscribe(...removedPattern, (err: any) => {
                if (err) this.logger.error('Redis pattern unsubscribe error:', err);
            });
        }

        this.directChannels = nextDirect;
        this.patternChannels = nextPattern;
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

    private async startStreamConsumer(url: string): Promise<void> {
        this.streamStopping = false;
        const streamKey = this.options.streamKey ?? 'tsdi:stream';
        const group = this.options.group ?? 'tsdi';
        const consumer = this.options.consumer
            ?? `${hostname()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
        const client = new Redis(url);
        this.streamClient = client;
        client.on(Events.ERROR, (err: Error) => this.logger.error('Redis stream consumer error:', err));
        try {
            await client.xgroup('CREATE', streamKey, group, '$', 'MKSTREAM');
            this.logger.info(`Redis stream group '${group}' ready on '${streamKey}'`);
        } catch (err: any) {
            if (!String(err?.message ?? '').includes('BUSYGROUP')) {
                throw err;
            }
        }
        this.streamLoop = this.consumeStream(client, streamKey, group, consumer);
    }

    /**
     * Consume new entries, and reclaim idle pending entries when the stream is
     * empty so a crashed consumer's messages are retried.
     */
    private async consumeStream(client: Redis, streamKey: string, group: string, consumer: string): Promise<void> {
        const block = Math.max(100, this.options.blockMs ?? 2000);
        const idle = Math.max(1000, this.options.claimIdleMs ?? 60_000);
        while (!this.streamStopping && !this.destroy$.isStopped) {
            let entries: any;
            try {
                entries = await (client as any).xreadgroup(
                    'GROUP', group, consumer, 'BLOCK', block, 'COUNT', 10, 'STREAMS', streamKey, '>'
                );
            } catch (err) {
                if (this.streamStopping) {
                    return;
                }
                this.logger.error('Redis stream read error:', err);
                await this.streamDelay(500);
                continue;
            }
            if (!entries?.length) {
                await this.reclaimPending(client, streamKey, group, consumer, idle);
                continue;
            }
            for (const [, list] of entries as any[]) {
                for (const entry of list ?? []) {
                    await this.handleStreamEntry(client, streamKey, group, entry);
                }
            }
        }
    }

    private async reclaimPending(
        client: Redis,
        streamKey: string,
        group: string,
        consumer: string,
        idle: number
    ): Promise<void> {
        try {
            const claimed: any = await (client as any).xautoclaim(streamKey, group, consumer, idle, '0-0', 'COUNT', 10);
            for (const entry of claimed?.[1] ?? []) {
                if (entry?.[0]) {
                    await this.handleStreamEntry(client, streamKey, group, entry);
                }
            }
        } catch (err) {
            if (!this.streamStopping) {
                this.logger.error('Redis stream reclaim error:', err);
            }
        }
    }

    private get consumerRuntime(): ConsumerRuntime {
        if (this.runtime) {
            return this.runtime;
        }
        const idempotency = this.options?.idempotency
            ? {
                ...this.options.idempotency,
                store: this.options.idempotency.store
                    ?? (this.streamClient
                        ? (this.redisIdempotency ??= new RedisIdempotencyStore(this.streamClient))
                        : undefined)
            }
            : undefined;
        return this.runtime = new ConsumerRuntime({
            retry: this.options?.retry,
            concurrency: this.options?.concurrency,
            idempotency,
            metrics: this.consumerMetrics ?? undefined,
            labels: { transport: 'redis', group: this.options?.group }
        });
    }

    private async handleStreamEntry(client: Redis, streamKey: string, group: string, entry: any): Promise<void> {
        const id = String(entry?.[0] ?? '');
        if (!id) {
            return;
        }
        const fields: any[] = entry?.[1] ?? [];
        let channel = '';
        let message = '';
        for (let i = 0; i < fields.length; i += 2) {
            if (fields[i] === 'channel') {
                channel = String(fields[i + 1] ?? '');
            } else if (fields[i] === 'message') {
                message = String(fields[i + 1] ?? '');
            }
        }
        if (!channel) {
            await this.ackStreamEntry(client, streamKey, group, id);
            return;
        }
        let lastError: unknown;
        const handled = await this.consumerRuntime.handle({
            id,
            payload: { channel, message },
            labels: { topic: streamKey },
            ack: () => this.ackStreamEntry(client, streamKey, group, id),
            // Leave the entry pending so XAUTOCLAIM can retry after the idle
            // window when the in-process retry budget is exhausted.
            fail: () => undefined
        }, async () => {
            const context = createRequestContext(this.injector, [
                [REQUEST, { channel, message }],
            ]);
            try {
                await lastValueFrom(
                    this.handler.handle({ channel, message } as TReq, context)
                        .pipe(takeUntil(race(this.destroy$).pipe(take(1))))
                );
            } catch (err) {
                lastError = err;
                throw err;
            }
        });
        if (!handled && !this.streamStopping) {
            this.logger.error('Redis stream handling error:', lastError);
        }
    }

    private async ackStreamEntry(client: Redis, streamKey: string, group: string, id: string): Promise<void> {
        try {
            await client.xack(streamKey, group, id);
        } catch (err) {
            if (!this.streamStopping) {
                this.logger.error('Redis stream ack error:', err);
            }
        }
    }

    private async stopStreamConsumer(): Promise<void> {
        this.streamStopping = true;
        this.runtime?.close();
        const client = this.streamClient;
        const loop = this.streamLoop;
        this.streamClient = undefined;
        this.streamLoop = undefined;
        if (client) {
            client.disconnect();
        }
        if (loop) {
            await Promise.race([
                loop.catch(() => undefined),
                new Promise<void>(resolve => {
                    const timer = setTimeout(resolve, 5000);
                    if (typeof (timer as any).unref === 'function') {
                        (timer as any).unref();
                    }
                })
            ]);
        }
        await this.runtime?.drain(5000);
    }

    private streamDelay(ms: number): Promise<void> {
        return new Promise(resolve => {
            const timer = setTimeout(resolve, ms);
            if (typeof (timer as any).unref === 'function') {
                (timer as any).unref();
            }
        });
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
