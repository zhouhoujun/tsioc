import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Subscribe, Payload } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { useRedisTransport } from '../src/server';
import { withRedisTransport, RedisClient, RedisRequest } from '../src/client';
import Redis from 'ioredis';
import expect = require('expect');

const REDIS_URL = 'redis://127.0.0.1:6379';

describe('Redis Streams delivery', () => {
    describe('server consumption', () => {
        const STREAM = `tsdi:test:stream:${Date.now()}:server`;
        const GROUP = 'server-group';
        let received: any[] = [];
        let resolveMessage: ((value: any) => void) | undefined;

        class StreamService {
            @Subscribe('stream.topic', Transport.Redis)
            onEvent(@Payload() payload: any) {
                received.push(payload);
                resolveMessage?.(payload);
                resolveMessage = undefined;
                return { ok: true };
            }
        }

        @Module({
            imports: [LoggerModule],
            declarations: [StreamService],
            providers: [
                provideService(
                    useRouter(),
                    useRedisTransport({
                        url: REDIS_URL,
                        delivery: 'stream',
                        streamKey: STREAM,
                        group: GROUP,
                        claimIdleMs: 1000,
                        blockMs: 200,
                        asDefault: true
                    })
                )
            ]
        })
        class StreamServerModule { }

        let ctx: ApplicationContext;
        let producer: Redis;

        before(async () => {
            ctx = await Application.run(StreamServerModule);
            producer = new Redis(REDIS_URL);
        });
        after(async () => {
            await producer?.quit();
            await ctx?.close();
        });

        it('consumes a raw stream entry and acknowledges it', async () => {
            received = [];
            const wait = new Promise<any>(resolve => { resolveMessage = resolve; });
            await producer.xadd(
                STREAM,
                '*',
                'channel',
                'stream.topic',
                'message',
                JSON.stringify({ payload: { ok: 1 } })
            );

            const result = await Promise.race([
                wait,
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]);
            expect(result).toEqual({ ok: 1 });
            expect(received).toEqual([{ ok: 1 }]);
            expect(await producer.xlen(STREAM)).toBe(1);
            const pending: any = await producer.xpending(STREAM, GROUP);
            expect(Number(pending?.[0] ?? 0)).toBe(0);
        });
    });

    describe('stream retry policy', () => {
        const STREAM = `tsdi:test:stream:${Date.now()}:retry`;
        const GROUP = 'retry-group';
        let attempts = 0;
        let resolveMessage: ((value: any) => void) | undefined;

        class RetryStreamService {
            @Subscribe('stream.retry', Transport.Redis)
            onEvent(@Payload() payload: any) {
                attempts += 1;
                if (attempts === 1) {
                    throw new Error('transient stream failure');
                }
                resolveMessage?.(payload);
                resolveMessage = undefined;
                return { ok: true };
            }
        }

        @Module({
            imports: [LoggerModule],
            declarations: [RetryStreamService],
            providers: [
                provideService(
                    useRouter(),
                    useRedisTransport({
                        url: REDIS_URL,
                        delivery: 'stream',
                        streamKey: STREAM,
                        group: GROUP,
                        retry: { maxAttempts: 1 },
                        blockMs: 200,
                        asDefault: true
                    })
                )
            ]
        })
        class RetryStreamModule { }

        let ctx: ApplicationContext;
        let producer: Redis;

        before(async () => {
            ctx = await Application.run(RetryStreamModule);
            producer = new Redis(REDIS_URL);
        });
        after(async () => {
            await producer?.quit();
            await ctx?.close();
        });

        it('retries in-process before acking a stream entry', async () => {
            attempts = 0;
            const wait = new Promise<any>(resolve => { resolveMessage = resolve; });
            await producer.xadd(
                STREAM,
                '*',
                'channel',
                'stream.retry',
                'message',
                JSON.stringify({ payload: { retried: true } })
            );
            const result = await Promise.race([
                wait,
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]);
            expect(result).toEqual({ retried: true });
            expect(attempts).toBe(2);
            const pending: any = await producer.xpending(STREAM, GROUP);
            expect(Number(pending?.[0] ?? 0)).toBe(0);
        });
    });

    describe('client publishing', () => {
        const STREAM = `tsdi:test:stream:${Date.now()}:client`;

        @Module({
            imports: [LoggerModule],
            providers: [
                provideClient(
                    withRedisTransport({ url: REDIS_URL, delivery: 'stream', streamKey: STREAM, asDefault: true })
                )
            ]
        })
        class StreamClientModule { }

        let ctx: ApplicationContext;
        let producer: Redis;

        before(async () => {
            ctx = await Application.run(StreamClientModule);
            producer = new Redis(REDIS_URL);
        });
        after(async () => {
            await producer?.quit();
            await ctx?.close();
        });

        it('publishes events with XADD in client stream mode', async () => {
            const client = ctx.get(RedisClient);
            await new Promise<void>((resolve, reject) => {
                client.send(new RedisRequest('stream.topic', null, { observe: 'events', payload: { from: 'client' } } as any, 'PUBLISH'))
                    .subscribe({ error: reject, complete: () => resolve() });
            });

            expect(await producer.xlen(STREAM)).toBe(1);
            const entries: any = await producer.xrange(STREAM, '-', '+');
            expect(entries).toHaveLength(1);
            const fields: string[] = entries[0][1];
            const at = (name: string) => fields[fields.indexOf(name) + 1];
            expect(at('channel')).toBe('stream.topic');
            expect(JSON.parse(at('message')).payload).toEqual({ from: 'client' });
        });
    });
});
