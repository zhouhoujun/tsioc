import { createInjector, asProvider, Injector, Provider, isNil } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, REQUEST, ResponseEventPacket } from '@tsdi/common';
import { SOCKET, useBrokerClientTransfer } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature, wrapClientBackendWithTransfer } from '@tsdi/client';
import { KAFKA_CLIENT_OPTIONS, KafkaClientOptions } from './options';
import { KafkaClient } from './client';
import { KafkaPatternFormatter } from '../server';
import { KafkaRequest } from './request';
import { Observable } from 'rxjs';
import { Consumer, Kafka, Producer } from 'kafkajs';

function kafkaClientTransportFactory(option: Partial<KafkaClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.Kafka, side: TransferSide.client,
        ...option, features: {
            defaultTransfer: useBrokerClientTransfer<KafkaRequest<any>>({
                mapping: (request) => JSON.stringify(serializeRequest(request, 'payload', request?.id)),
                match: (response, request) => !(response && typeof response === 'object' && response.id != null && response.id !== request?.id),
                normalize: (parsed) => {
                    if (parsed && typeof parsed === 'object' && ('status' in parsed || 'statusCode' in parsed || 'ok' in parsed || 'body' in parsed || 'payload' in parsed || 'error' in parsed)) {
                        const status = parsed.status ?? parsed.statusCode ?? (parsed.error ? 500 : 200);
                        const statusMessage = parsed.statusMessage ?? parsed.statusText ?? parsed.error?.message ?? (status >= 400 ? 'Error' : 'OK');
                        const body = !isNil(parsed.body) ? parsed.body : parsed.payload;
                        return {
                            ...parsed,
                            status,
                            statusCode: parsed.statusCode ?? status,
                            statusMessage,
                            statusText: statusMessage,
                            ok: parsed.ok ?? (!parsed.error && status < 400),
                            body,
                            payload: !isNil(body) ? body : parsed.payload,
                            error: parsed.error,
                            headers: parsed.headers ?? {}
                        };
                    }
                    return {
                        status: 200,
                        statusCode: 200,
                        statusMessage: 'OK',
                        statusText: 'OK',
                        ok: true,
                        body: parsed,
                        payload: parsed,
                        headers: {}
                    };
                }
            }),
            ...option.features
        },
        brokers: option.brokers ? [...option.brokers] : undefined,
        brokerCompatBrokers: option.brokerCompatBrokers ? [...option.brokerCompatBrokers] : undefined,
    } as KafkaClientOptions;
    config.formatter ??= KafkaPatternFormatter;
    config.providers ??= [];
    config.providers.push(
        { provide: KAFKA_CLIENT_OPTIONS, useValue: config },
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);
    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({ provide: backendToken, useFactory: (injector: Injector) => wrapClientBackendWithTransfer(injector, config, createKafkaClientBackend(config)), deps: [Injector], multi: true }),
        { provide: hanlderToken, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] },
        {
            provide: clientToken,
            useFactory: (injector: Injector) => {
                const handler = injector.get(hanlderToken);
                const childInjector = createInjector(injector, {
                    providers: [
                        { provide: KAFKA_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        KafkaClient
                    ]
                });
                return childInjector.get(KafkaClient);
            },
            deps: [Injector]
        }
    ];
    if (asDefault) {
        providers.push({ provide: KafkaClient, useExisting: clientToken });
        if (config.formatter) {
            if (config.formatter === KafkaPatternFormatter) {
                providers.push(KafkaPatternFormatter);
            }
            providers.push({
                provide: PatternFormatter,
                useFactory: (injector: Injector) => injector.get(config.formatter!),
                deps: [Injector]
            });
        }
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}

export function withKafkaTransport(...options: Partial<KafkaClientOptions>[]): ClientTransportFeature[] {
    return options.map((o, i) => kafkaClientTransportFactory(o, o.asDefault ?? (i === 0)));
}

function createKafkaClientBackend(config: KafkaClientOptions) {
    return (input: any, context: any) => new Observable<any>((observer) => {
        const producer = context.get(SOCKET) as Producer | undefined;
        const request = context.get(REQUEST) as KafkaRequest<any> | undefined;
        if (!producer || !request) {
            observer.error(new Error('Kafka client context is incomplete'));
            return;
        }
        const replyRequest = request as KafkaRequest<any> & { responseTopic?: string };
        const topic = request.topic;
        const requestId = request.id ?? `${Date.now()}-${Math.random()}`;
        const responseTopic = replyRequest.responseTopic
            ?? `${topic}${config.responseTopicSuffix ?? '.response'}`;
        const payload = Buffer.isBuffer(input)
            ? input
            : Buffer.from(JSON.stringify(serializeRequest(request, 'payload', requestId, input)));

        if (request.observe === 'events') {
            producer.send({ topic, messages: [{ value: payload }] })
                .then(() => {
                    observer.next({ type: 0 } as ResponseEventPacket);
                    observer.complete();
                })
                .catch(err => observer.error(err));
            return;
        }

        let timer: NodeJS.Timeout | undefined;
        let consumer: Consumer | undefined;
        let closed = false;

        const cleanup = () => {
            if (closed) return Promise.resolve();
            closed = true;
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
            const current = consumer;
            consumer = undefined;
            return current?.disconnect().catch(() => undefined) ?? Promise.resolve();
        };

        const fail = (err: any) => {
            cleanup().finally(() => observer.error(err));
        };

        (async () => {
            const KafkaCtor = config.kafkaFactory ?? Kafka;
            const kafka = new KafkaCtor({
                clientId: `${config.clientId || 'tsdi-client'}-reply`,
                brokers: resolveKafkaBrokers(config),
            });
            consumer = kafka.consumer({ groupId: `${config.clientId || 'tsdi-client'}-reply-${Date.now()}-${Math.random()}` });
            await consumer.connect();
            await consumer.subscribe({ topic: responseTopic, fromBeginning: false });
            await consumer.run({
                eachMessage: async ({ message }) => {
                    const value = message.value?.toString() ?? '';
                    try {
                        let parsed: any = value;
                        try {
                            parsed = JSON.parse(value);
                        } catch {
                            // keep raw string payload
                        }
                        if (parsed && typeof parsed === 'object' && parsed.id != null && parsed.id !== requestId) {
                            return;
                        }
                        if (request.observe === 'observe') {
                            observer.next(parsed);
                            return;
                        }
                        await cleanup();
                        observer.next(parsed);
                        observer.complete();
                    } catch (err) {
                        fail(err);
                    }
                }
            });
            await producer.send({ topic, messages: [{ value: payload }] });
            if (request.observe !== 'observe') {
                timer = setTimeout(() => {
                    fail(new Error('Timeout has occurred'));
                }, request.timeout ?? 10000);
            }
        })().catch(err => fail(err));

        return () => {
            void cleanup();
        };
    });
}

function serializeRequest(request: any, payloadKey: 'body' | 'payload', requestId?: string | number, payloadValue?: any) {
    const json: Record<string, any> = typeof request?.toJson === 'function'
        ? request.toJson({ payloadKey })
        : {};
    if (requestId != null) {
        json.id = requestId;
    }
    const nextPayload = !isNil(payloadValue) ? payloadValue : request[payloadKey];
    if (!isNil(nextPayload)) {
        json[payloadKey] = nextPayload;
    }
    return json;
}

function normalizeTopicFromUrl(url?: string) {
    if (!url) {
        return undefined;
    }
    const [pathname] = String(url).split('?', 2);
    return pathname.startsWith('/') ? pathname.slice(1).replace(/\//g, '.') : pathname;
}


function resolveKafkaBrokers(config: KafkaClientOptions): string[] {
    return config.brokerCompatBrokers?.length ? config.brokerCompatBrokers : (config.brokers || ['localhost:9092']);
}
