import expect = require('expect');
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Subscribe, Payload } from '@tsdi/service';
import { useRedisTransport } from '../src/server';
import Redis from 'ioredis';

const REDIS_URL = 'redis://127.0.0.1:6379';
const TOTAL = 500;

describe('Redis Streams burst/backpressure', () => {
    const STREAM = `tsdi:test:stream:${Date.now()}:load`;
    const GROUP = 'load-group';
    let received = 0;
    let resolveDone: (() => void) | undefined;

    class LoadService {
        @Subscribe('load.topic', Transport.Redis)
        onEvent(@Payload() payload: any) {
            received += 1;
            if (received >= TOTAL) {
                resolveDone?.();
                resolveDone = undefined;
            }
            return { ok: true, payload };
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [LoadService],
        providers: [
            provideService(
                useRouter(),
                useRedisTransport({
                    url: REDIS_URL,
                    delivery: 'stream',
                    streamKey: STREAM,
                    group: GROUP,
                    concurrency: 16,
                    blockMs: 100,
                    asDefault: true
                })
            )
        ]
    })
    class LoadModule { }

    let ctx: ApplicationContext;
    let producer: Redis;

    before(async () => {
        ctx = await Application.run(LoadModule);
        producer = new Redis(REDIS_URL);
    });

    after(async () => {
        await producer?.quit();
        await ctx?.close();
    });

    it('consumes a burst without dropping or leaving pending entries', async () => {
        received = 0;
        const done = new Promise<void>(resolve => { resolveDone = resolve; });
        const pipeline = producer.pipeline();
        for (let index = 0; index < TOTAL; index++) {
            pipeline.xadd(
                STREAM,
                '*',
                'channel',
                'load.topic',
                'message',
                JSON.stringify({ payload: { index } })
            );
        }
        await pipeline.exec();

        await Promise.race([
            done,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`only received ${received}/${TOTAL}`)), 15_000))
        ]);
        expect(received).toBeGreaterThanOrEqual(TOTAL);

        for (let attempt = 0; attempt < 40; attempt++) {
            const pending: any = await producer.xpending(STREAM, GROUP);
            if (Number(pending?.[0] ?? 0) === 0) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        const pending: any = await producer.xpending(STREAM, GROUP);
        expect(Number(pending?.[0] ?? 0)).toBe(0);
    });
});
