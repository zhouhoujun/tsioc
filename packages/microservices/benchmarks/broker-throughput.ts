/**
 * Broker throughput probe (Redis Streams).
 *
 *   MS_BROKER_BENCH_PROFILE=1 bash scripts/agents-gate.sh ms-broker-bench
 *
 * Opt-in because it needs a real Redis. Publishes N messages, waits for all to
 * be consumed, and reports messages/sec plus pending count.
 */
import { Application, ApplicationContext } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Subscribe, Payload } from '@tsdi/service';
import { useRedisTransport } from '@tsdi/redis';
import Redis from 'ioredis';

const REDIS_URL = process.env.BROKER_BENCH_REDIS_URL ?? 'redis://127.0.0.1:6379';
const TOTAL = Number(process.env.BROKER_BENCH_MESSAGES ?? 5000);
const CONCURRENCY = Number(process.env.BROKER_BENCH_CONCURRENCY ?? 32);

async function main(): Promise<void> {
    const stream = `tsdi:bench:${Date.now().toString(36)}`;
    const group = `bench-${process.pid}`;
    let received = 0;
    let resolveDone: (() => void) | undefined;

    class BenchService {
        @Subscribe('bench.topic', Transport.Redis)
        onEvent(@Payload() payload: any) {
            received += 1;
            if (received >= TOTAL) {
                resolveDone?.();
                resolveDone = undefined;
            }
            return payload;
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [BenchService],
        providers: [
            provideService(
                useRouter(),
                useRedisTransport({
                    url: REDIS_URL,
                    delivery: 'stream',
                    streamKey: stream,
                    group,
                    concurrency: CONCURRENCY,
                    blockMs: 100,
                    asDefault: true
                })
            )
        ]
    })
    class BenchModule { }

    let ctx: ApplicationContext | undefined;
    let producer: Redis | undefined;
    try {
        ctx = await Application.run(BenchModule);
        producer = new Redis(REDIS_URL);
        const done = new Promise<void>(resolve => { resolveDone = resolve; });
        const startedAt = Date.now();
        const pipeline = producer.pipeline();
        for (let index = 0; index < TOTAL; index++) {
            pipeline.xadd(stream, '*', 'channel', 'bench.topic', 'message', JSON.stringify({ index }));
        }
        await pipeline.exec();
        await Promise.race([
            done,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout: ${received}/${TOTAL}`)), 120_000))
        ]);
        const durationMs = Date.now() - startedAt;
        let pending = 0;
        for (let attempt = 0; attempt < 40; attempt++) {
            const info: any = await producer.xpending(stream, group);
            pending = Number(info?.[0] ?? 0);
            if (pending === 0) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        console.log(JSON.stringify({
            transport: 'redis-stream',
            messages: received,
            concurrency: CONCURRENCY,
            durationMs,
            messagesPerSecond: Math.round(received / (durationMs / 1000)),
            pending
        }, null, 2));
        if (received < TOTAL || pending !== 0) {
            process.exitCode = 1;
        }
    } finally {
        await producer?.quit().catch(() => undefined);
        await ctx?.close();
    }
}

main().catch(error => {
    console.error('broker throughput failed:', error);
    process.exit(1);
});
