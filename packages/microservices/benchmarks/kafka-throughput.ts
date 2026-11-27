/**
 * Kafka throughput probe.
 *
 *   MS_BROKER_BENCH_PROFILE=1 bash scripts/agents-gate.sh ms-kafka-bench
 *
 * Opt-in because it needs a real Kafka. In the default mode it publishes N
 * messages, waits until the framework consumer has handled all of them, and
 * reports messages/sec. With `BROKER_BENCH_KAFKA_DURATION_MS` it becomes a
 * sustained broker load probe: produce for the configured duration (optionally
 * rate-limited), then drain and report backlog/RSS.
 *
 * Environment:
 *   BROKER_BENCH_KAFKA_BROKERS      default 127.0.0.1:9092
 *   BROKER_BENCH_KAFKA_MESSAGES     default 5000 (falls back to BROKER_BENCH_MESSAGES)
 *   BROKER_BENCH_KAFKA_CONCURRENCY  default 16 (falls back to BROKER_BENCH_CONCURRENCY)
 *   BROKER_BENCH_KAFKA_TOPIC        default generated per run
 *   BROKER_BENCH_KAFKA_DURATION_MS  enable sustained mode for this many milliseconds
 *   BROKER_BENCH_KAFKA_RATE         sustained mode target messages/sec (0 = max)
 */
import { Application, ApplicationContext } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Subscribe, Payload } from '@tsdi/service';
import { Kafka } from 'kafkajs';
import { useKafkaTransport } from '../kafka/src/server';

const BROKERS = (process.env.BROKER_BENCH_KAFKA_BROKERS ?? '127.0.0.1:9092')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
const TOTAL = Number(
    process.env.BROKER_BENCH_KAFKA_MESSAGES
    ?? process.env.BROKER_BENCH_MESSAGES
    ?? 5000
);
const CONCURRENCY = Number(
    process.env.BROKER_BENCH_KAFKA_CONCURRENCY
    ?? process.env.BROKER_BENCH_CONCURRENCY
    ?? 16
);
const DURATION_MS = Number(process.env.BROKER_BENCH_KAFKA_DURATION_MS ?? 0);
const RATE = Number(process.env.BROKER_BENCH_KAFKA_RATE ?? 0);
const TOPIC = process.env.BROKER_BENCH_KAFKA_TOPIC ?? `tsdi.bench.${Date.now().toString(36)}`;
const GROUP = `bench-${process.pid}-${Date.now().toString(36)}`;
const CHUNK = 500;
const EXACT_TIMEOUT_MS = 120_000;
const DRAIN_TIMEOUT_MS = 60_000;

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function payload(index: number): string {
    return JSON.stringify({ url: TOPIC, payload: { index } });
}

async function main(): Promise<void> {
    const seen = new Set<number>();
    let received = 0;
    let resolveDone: (() => void) | undefined;

    class BenchService {
        @Subscribe(TOPIC, Transport.Kafka)
        onEvent(@Payload() body: any) {
            received += 1;
            if (DURATION_MS <= 0) {
                const index = Number(body?.index);
                if (Number.isFinite(index)) {
                    seen.add(index);
                }
                if (seen.size >= TOTAL) {
                    resolveDone?.();
                    resolveDone = undefined;
                }
            }
            return undefined;
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [BenchService],
        providers: [
            provideService(
                useRouter(),
                useKafkaTransport({
                    brokers: BROKERS,
                    clientId: `bench-${process.pid}`,
                    groupId: GROUP,
                    topics: [{ topic: TOPIC }],
                    concurrency: CONCURRENCY,
                    fromBeginning: false,
                    asDefault: true
                })
            )
        ]
    })
    class BenchModule { }

    const kafka = new Kafka({ clientId: `bench-producer-${process.pid}`, brokers: BROKERS });
    const admin = kafka.admin();
    const producer = kafka.producer({ allowAutoTopicCreation: true });
    let ctx: ApplicationContext | undefined;
    try {
        await admin.connect();
        await admin.createTopics({
            topics: [{ topic: TOPIC, numPartitions: 1, replicationFactor: 1 }]
        }).catch(() => undefined);
        await admin.disconnect();

        await producer.connect();
        ctx = await Application.run(BenchModule);

        if (DURATION_MS > 0) {
            await runSustained(producer);
        } else {
            await runExact(producer);
        }
    } finally {
        await producer.disconnect().catch(() => undefined);
        await admin.disconnect().catch(() => undefined);
        await ctx?.close();
    }

    async function runExact(producerClient: ReturnType<Kafka['producer']>): Promise<void> {
        const done = new Promise<void>(resolve => { resolveDone = resolve; });
        const startedAt = Date.now();
        for (let offset = 0; offset < TOTAL; offset += CHUNK) {
            const messages = [];
            for (let index = offset; index < Math.min(offset + CHUNK, TOTAL); index++) {
                messages.push({ key: String(index), value: payload(index) });
            }
            await producerClient.send({ topic: TOPIC, messages });
        }
        await Promise.race([
            done,
            new Promise((_resolve, reject) => setTimeout(
                () => reject(new Error(`timeout: ${seen.size}/${TOTAL}`)),
                EXACT_TIMEOUT_MS
            ))
        ]);
        const durationMs = Date.now() - startedAt;
        console.log(JSON.stringify({
            transport: 'kafka',
            mode: 'fixed',
            topic: TOPIC,
            messages: seen.size,
            concurrency: CONCURRENCY,
            durationMs,
            messagesPerSecond: Math.round(seen.size / (durationMs / 1000))
        }, null, 2));
        if (seen.size < TOTAL) {
            process.exitCode = 1;
        }
    }

    async function runSustained(producerClient: ReturnType<Kafka['producer']>): Promise<void> {
        const startedAt = Date.now();
        const deadline = startedAt + DURATION_MS;
        let produced = 0;
        while (Date.now() < deadline) {
            const chunkStarted = Date.now();
            const messages = [];
            for (let index = produced; index < produced + CHUNK; index++) {
                messages.push({ key: String(index), value: payload(index) });
            }
            await producerClient.send({ topic: TOPIC, messages });
            produced += CHUNK;
            if (RATE > 0) {
                const expectedMs = (CHUNK / RATE) * 1000;
                await sleep(Math.max(0, expectedMs - (Date.now() - chunkStarted)));
            }
        }
        const drainDeadline = Date.now() + DRAIN_TIMEOUT_MS;
        while (received < produced && Date.now() < drainDeadline) {
            await sleep(50);
        }
        const durationMs = Date.now() - startedAt;
        const backlog = produced - received;
        console.log(JSON.stringify({
            transport: 'kafka',
            mode: 'sustained',
            topic: TOPIC,
            rate: RATE,
            produced,
            messages: received,
            backlog,
            concurrency: CONCURRENCY,
            durationMs,
            messagesPerSecond: Math.round(received / (durationMs / 1000)),
            rssBytes: process.memoryUsage().rss
        }, null, 2));
        if (backlog !== 0) {
            process.exitCode = 1;
        }
    }
}

main().catch(error => {
    console.error('kafka throughput failed:', error);
    process.exit(1);
});
