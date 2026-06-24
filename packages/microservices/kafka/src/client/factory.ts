import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, REQUEST, useSimpleJson, parseQueryString, ErrorResponse, ResponseEventPacket } from '@tsdi/common';
import { SOCKET } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
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
            defaultTransfer: useSimpleJson({
                mapping: (value, context) => mapRequestValue(value, context)
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
        asProvider({ provide: backendToken, useFactory: () => createKafkaClientBackend(config), multi: true }),
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
        const formatter = context.get(PatternFormatter, defaultFormatter);
        const payload = Buffer.isBuffer(input)
            ? input
            : Buffer.from(JSON.stringify(serializeRequest({ ...request, id: requestId }, formatter, 'payload')));

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
                        const parsed = parseKafkaReply(value, request, requestId);
                        if (!parsed) {
                            return;
                        }
                        if (request.observe === 'observe') {
                            if (parsed instanceof ErrorResponse) {
                                fail(parsed);
                                return;
                            }
                            observer.next(parsed.body ?? parsed.payload ?? parsed);
                            return;
                        }
                        await cleanup();
                        if (request.observe === 'response') {
                            observer.next(parsed);
                            observer.complete();
                            return;
                        }
                        if (parsed instanceof ErrorResponse) {
                            observer.error(parsed);
                            return;
                        }
                        observer.next(parsed.body ?? parsed.payload ?? parsed);
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

function mapRequestValue(value: any, context: any) {
    if (value && typeof value === 'object' && ('url' in value || 'topic' in value || 'pattern' in value)) {
        return serializeRequest(value, context.get(PatternFormatter) ?? defaultFormatter, 'payload');
    }
    return value;
}

function serializeRequest(request: any, formatter: PatternFormatter, payloadKey: 'body' | 'payload') {
    const json: Record<string, any> = typeof request?.toJson === 'function'
        ? request.toJson({ formatter, payloadKey })
        : {};
    json.topic ??= request.topic ?? normalizeTopicFromUrl(request.url);
    if (request.url) {
        json.url ??= request.url;
    }
    if (request.params && !json.params) {
        json.params = typeof request.params?.toRecord === 'function' ? request.params.toRecord() : request.params;
    }
    if (request.url && request.query && !json.query) {
        json.query = request.query;
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

function parseKafkaReply(message: string, request: KafkaRequest<any>, requestId: string | number) {
    let parsed: any = message;
    try {
        parsed = JSON.parse(message);
    } catch {
        parsed = message;
    }
    if (parsed && typeof parsed === 'object' && parsed.id != null && parsed.id !== requestId) {
        return null;
    }
    if (request.observe === 'response') {
        return normalizeResponse(parsed);
    }
    const normalized = normalizeResponse(parsed);
    if (!normalized.ok) {
        return new ErrorResponse({
            status: normalized.status,
            statusMessage: normalized.statusMessage,
            statusText: normalized.statusText,
            headers: normalized.headers,
            error: normalized.error ?? normalized.body ?? normalized.payload
        });
    }
    return normalized;
}

function normalizeResponse(parsed: any) {
    if (parsed && typeof parsed === 'object' && ('status' in parsed || 'statusCode' in parsed || 'ok' in parsed || 'body' in parsed || 'payload' in parsed || 'error' in parsed)) {
        const status = parsed.status ?? parsed.statusCode ?? (parsed.error ? 500 : 200);
        const statusMessage = parsed.statusMessage ?? parsed.statusText ?? parsed.error?.message ?? (status >= 400 ? 'Error' : 'OK');
        const body = parsed.body ?? parsed.payload;
        return {
            ...parsed,
            status,
            statusCode: parsed.statusCode ?? status,
            statusMessage,
            statusText: statusMessage,
            ok: parsed.ok ?? (!parsed.error && status < 400),
            body,
            payload: body ?? parsed.payload,
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

function resolveKafkaBrokers(config: KafkaClientOptions): string[] {
    return config.brokerCompatBrokers?.length ? config.brokerCompatBrokers : (config.brokers || ['localhost:9092']);
}
