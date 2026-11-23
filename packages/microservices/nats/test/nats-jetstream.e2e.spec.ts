import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Subscribe, Payload } from '@tsdi/service';
import { provideClient } from '@tsdi/client';
import { connect, NatsConnection, JetStreamClient, JetStreamManager, StringCodec } from 'nats';
import { useNatsTransport } from '../src/server';
import { withNatsTransport, NatsClient, NatsRequest } from '../src/client';
import expect = require('expect');

const NATS_URL = 'nats://127.0.0.1:4222';
const SUFFIX = Date.now();
const STREAM = `TSDI_JS_${SUFFIX}`;
const DURABLE = `js-durable-${SUFFIX}`;
const SUBJECT = `js.topic.${SUFFIX}`;

describe('NATS JetStream delivery', () => {
    const sc = StringCodec();
    let resolveMessage: ((value: any) => void) | undefined;
    let received: any[] = [];

    function nextMessage(): Promise<any> {
        return new Promise(resolve => {
            resolveMessage = resolve;
        });
    }

    class JsService {
        @Subscribe(SUBJECT, Transport.NATS)
        onEvent(@Payload() payload: any) {
            received.push(payload);
            resolveMessage?.(payload);
            resolveMessage = undefined;
            return { ok: true };
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [JsService],
        providers: [
            provideService(
                useRouter(),
                useNatsTransport({
                    url: NATS_URL,
                    delivery: 'jetstream',
                    stream: STREAM,
                    jetstreamSubject: SUBJECT,
                    durable: DURABLE,
                    ackWaitMs: 1000,
                    maxDeliver: 2,
                    asDefault: true
                })
            )
        ]
    })
    class JsServerModule { }

    @Module({
        imports: [LoggerModule],
        providers: [
            provideClient(withNatsTransport({ url: NATS_URL, delivery: 'jetstream', asDefault: true }))
        ]
    })
    class JsClientModule { }

    let ctx: ApplicationContext;
    let nc: NatsConnection;
    let js: JetStreamClient;
    let jsm: JetStreamManager;

    before(async () => {
        ctx = await Application.run(JsServerModule);
        nc = await connect({ servers: NATS_URL });
        js = nc.jetstream();
        jsm = await nc.jetstreamManager();
    });

    after(async () => {
        await nc?.drain();
        await ctx?.close();
        try {
            await jsm?.streams.delete(STREAM);
        } catch {
            // stream may already be gone
        }
    });

    async function waitForAck(): Promise<any> {
        const deadline = Date.now() + 3000;
        let info: any;
        while (Date.now() < deadline) {
            info = await jsm.consumers.info(STREAM, DURABLE);
            if ((info.num_ack_pending ?? 0) === 0 && (info.ack_floor?.stream_seq ?? 0) >= 1) {
                return info;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return info;
    }

    it('consumes and acknowledges a JetStream message', async () => {
        received = [];
        const wait = nextMessage();
        await js.publish(SUBJECT, sc.encode(JSON.stringify({ payload: { ok: 1 } })));

        expect(await Promise.race([
            wait,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        ])).toEqual({ ok: 1 });
        expect(received).toEqual([{ ok: 1 }]);

        const info = await waitForAck();
        expect(info.num_ack_pending).toBe(0);
        expect(info.ack_floor?.stream_seq ?? 0).toBeGreaterThanOrEqual(1);
    });

    it('publishes events with js.publish in client jetstream mode', async () => {
        const clientCtx = await Application.run(JsClientModule);
        try {
            const client = clientCtx.get(NatsClient);
            const wait = nextMessage();
            await new Promise<void>((resolve, reject) => {
                client.send(new NatsRequest(SUBJECT, null, {
                    observe: 'events',
                    payload: { from: 'client' }
                } as any, 'PUBLISH')).subscribe({ error: reject, complete: resolve });
            });

            expect(await Promise.race([
                wait,
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ])).toEqual({ from: 'client' });
            expect((await waitForAck()).num_ack_pending).toBe(0);
        } finally {
            await clientCtx.close();
        }
    });
});
