import { Inject, Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { REQUEST, Transport } from '@tsdi/common';
import { provideService, useRouter, Subscribe, Payload, getRouter } from '@tsdi/service';
import { useRedisTransport, RedisServer } from '../src/server';
import { of } from 'rxjs';
import Redis from 'ioredis';
import expect = require('expect');

const REDIS_URL = 'redis://127.0.0.1:6379';
const CHANNEL = 'topic-device';

describe('Redis subscribe routing', () => {
    class RedisPatternService {
        @Subscribe(CHANNEL, Transport.Redis)
        subscribe(@Payload() payload: any, @Payload('message') message: string, @Inject(REQUEST) request: any) {
            return {
                message,
                payload,
                request
            };
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [RedisPatternService],
        providers: [
            provideService(
                useRouter(),
                useRedisTransport({ url: REDIS_URL, asDefault: true })
            )
        ]
    })
    class RedisPatternModule { }

    let ctx: ApplicationContext;
    let publisher: Redis;
    let subscriber: Redis;

    before(async () => {
        ctx = await Application.run(RedisPatternModule);
        publisher = new Redis(REDIS_URL);
        subscriber = new Redis(REDIS_URL);
    });

    after(async () => {
        if (subscriber) {
            await subscriber.quit();
        }
        if (publisher) {
            await publisher.quit();
        }
        if (ctx) {
            await ctx.destroy();
        }
    });

    it('reconciles broker subscriptions after dynamic route registration', async () => {
        const router = getRouter(ctx, Transport.Redis, true);
        const server = (ctx.runners.getRef(RedisServer as any) as any).instance as RedisServer;

        (router as any).registerRoutes('dynamic-redis', [{
            path: 'dynamic/channel',
            pattern: 'dynamic/channel',
            handle: () => of('dynamic')
        } as any]);
        await new Promise(resolve => setTimeout(resolve, 100));

        expect((server as any).directChannels.has('dynamic.channel')).toBe(true);

        (router as any).removeRoutes('dynamic-redis');
        await new Promise(resolve => setTimeout(resolve, 100));

        expect((server as any).directChannels.has('dynamic.channel')).toBe(false);
    });

    it('routes messages for channels discovered from @Subscribe', async () => {
        const result = await new Promise<any>(async (resolve, reject) => {
            const responseChannel = `${CHANNEL}:response`;
            const timer = setTimeout(() => reject(new Error('Timeout')), 1500);

            await subscriber.subscribe(responseChannel);
            subscriber.once('message', (_channel, payload) => {
                clearTimeout(timer);
                resolve(JSON.parse(payload));
            });

            await publisher.publish(CHANNEL, JSON.stringify({
                payload: { message: 'load' }
            }));
        });

        const body = result.body ?? result.payload;
        expect(result.ok).toBe(true);
        expect(body.message).toBe('load');
        expect(body.payload).toEqual({ message: 'load' });
        expect(body.request.channel).toBe(CHANNEL);
        expect(body.request.payload).toEqual({ message: 'load' });
    });
});
