import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { createRequestContext, REQUEST, ErrorResponse } from '@tsdi/common';
import { getClientBackendToken } from '@tsdi/client';
import { withKafkaTransport } from '../src/client';
import { KafkaRequest } from '../src/client/request';
import { lastValueFrom, take, toArray } from 'rxjs';
import { SOCKET } from '@tsdi/transport';

class FakeProducer {
    public sent: Array<{ topic: string; messages: Array<{ value: Buffer }> }> = [];

    send(payload: { topic: string; messages: Array<{ value: Buffer }> }) {
        this.sent.push(payload);
        return Promise.resolve();
    }
}

class FakeConsumer {
    public subscribed: string[] = [];
    public disconnected = 0;
    private eachMessage?: ({ message }: { message: { value: Buffer } }) => Promise<void>;

    connect() {
        return Promise.resolve();
    }

    subscribe(opts: { topic: string }) {
        this.subscribed.push(opts.topic);
        return Promise.resolve();
    }

    run(opts: { eachMessage: ({ message }: { message: { value: Buffer } }) => Promise<void> }) {
        this.eachMessage = opts.eachMessage;
        return Promise.resolve();
    }

    emitMessage(value: any) {
        return this.eachMessage?.({ message: { value: Buffer.from(JSON.stringify(value)) } });
    }

    disconnect() {
        this.disconnected += 1;
        return Promise.resolve();
    }
}

class FakeKafka {
    public consumers: FakeConsumer[] = [];

    constructor(_options?: any) {
        return;
    }

    consumer() {
        const consumer = new FakeConsumer();
        this.consumers.push(consumer);
        return consumer as any;
    }
}

describe('Kafka client backend', () => {
    function createBackend(fakeKafkaCtor: new (...args: any[]) => FakeKafka = FakeKafka) {
        const feature = withKafkaTransport({ brokers: ['localhost:9092'], kafkaFactory: fakeKafkaCtor as any, asDefault: true })[0];
        const backendToken = getClientBackendToken(feature.config as any);
        const originalKafka = require('kafkajs').Kafka;
        require('kafkajs').Kafka = fakeKafkaCtor;
        const injector = createInjector(feature.providers as any);
        const [backend] = injector.get(backendToken) as unknown as Array<(input: any, context: any) => any>;
        require('kafkajs').Kafka = originalKafka;
        return backend;
    }

    function createContext(request: KafkaRequest<any>, producer: FakeProducer) {
        const injector = createInjector();
        return createRequestContext(injector, [
            [REQUEST, request],
            [SOCKET, producer]
        ]);
    }

    it('returns ResponseEventPacket for emit after producer send succeeds', async () => {
        const backend = createBackend();
        const producer = new FakeProducer();
        const request = new KafkaRequest('topic.emit', null, { observe: 'events' } as any, 'SEND');
        const result: any = await lastValueFrom(backend('payload', createContext(request, producer)));

        expect(result).toEqual({ type: 0 });
        expect(producer.sent).toHaveLength(1);
        expect(producer.sent[0].topic).toBe('topic.emit');
    });

    it('returns body for body observe', async () => {
        const fakeKafka = new FakeKafka();
        const backend = createBackend(class extends FakeKafka { constructor() { super(); return fakeKafka as any; } });
        const producer = new FakeProducer();
        const request = new KafkaRequest('topic.body', null, { observe: 'body', responseType: 'text' } as any, 'SEND');
        const result$ = backend({ hello: 'world' }, createContext(request, producer));
        const resultPromise = lastValueFrom(result$);
        setTimeout(() => {
            const reqId = JSON.parse(producer.sent[0].messages[0].value.toString()).id;
            void fakeKafka.consumers[0].emitMessage({ id: reqId, status: 200, payload: 'done' });
        }, 0);

        const result = await resultPromise;
        expect(result).toBe('done');
        expect(fakeKafka.consumers[0].disconnected).toBe(1);
    });

    it('returns response envelope for response observe', async () => {
        const fakeKafka = new FakeKafka();
        const backend = createBackend(class extends FakeKafka { constructor() { super(); return fakeKafka as any; } });
        const producer = new FakeProducer();
        const request = new KafkaRequest('topic.response', null, { observe: 'response' } as any, 'SEND');
        const result$ = backend({ hello: 'world' }, createContext(request, producer));
        const resultPromise = lastValueFrom(result$);
        setTimeout(() => {
            const reqId = JSON.parse(producer.sent[0].messages[0].value.toString()).id;
            void fakeKafka.consumers[0].emitMessage({ id: reqId, status: 201, statusMessage: 'Created', payload: { ok: true } });
        }, 0);

        const result: any = await resultPromise;
        expect(result.status).toBe(201);
        expect(result.statusText).toBe('Created');
        expect(result.body).toEqual({ ok: true });
    });

    it('throws ErrorResponse for failed body observe reply', async () => {
        const fakeKafka = new FakeKafka();
        const backend = createBackend(class extends FakeKafka { constructor() { super(); return fakeKafka as any; } });
        const producer = new FakeProducer();
        const request = new KafkaRequest('topic.error', null, { observe: 'body' } as any, 'SEND');
        const result$ = backend({ hello: 'world' }, createContext(request, producer));

        setTimeout(() => {
            const reqId = JSON.parse(producer.sent[0].messages[0].value.toString()).id;
            void fakeKafka.consumers[0].emitMessage({ id: reqId, status: 500, statusMessage: 'Boom', error: { message: 'Boom' }, payload: { statusCode: 500 } });
        }, 0);

        await expect(lastValueFrom(result$)).rejects.toBeInstanceOf(ErrorResponse);
    });

    it('streams matching replies for observe until unsubscribe', async () => {
        const fakeKafka = new FakeKafka();
        const backend = createBackend(class extends FakeKafka { constructor() { super(); return fakeKafka as any; } });
        const producer = new FakeProducer();
        const request = new KafkaRequest('topic.observe', null, { observe: 'observe' } as any, 'SEND');
        const result$ = backend({ hello: 'world' }, createContext(request, producer));

        const promise = lastValueFrom(result$.pipe(take(2), toArray()));
        setTimeout(() => {
            const reqId = JSON.parse(producer.sent[0].messages[0].value.toString()).id;
            void fakeKafka.consumers[0].emitMessage({ id: 'other', status: 200, payload: 'skip' });
            void fakeKafka.consumers[0].emitMessage({ id: reqId, status: 200, payload: 'one' });
            void fakeKafka.consumers[0].emitMessage({ id: reqId, status: 200, payload: 'two' });
        }, 0);

        const result = await promise;
        expect(result).toEqual(['one', 'two']);
        expect(fakeKafka.consumers[0].disconnected).toBe(1);
    });
});
