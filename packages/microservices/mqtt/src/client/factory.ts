import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, useSimpleJson, REQUEST, Events, parseQueryString, ErrorResponse, ResponseEventPacket } from '@tsdi/common'
import { SOCKET } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { MQTT_CLIENT_OPTIONS, MqttClientOptions } from './options';
import { MqttClient } from './client';
import { MqttRequest } from './request';
import { Observable } from 'rxjs';
import * as mqtt from 'mqtt';

function mqttClientTransportFactory(option: Partial<MqttClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.MQTT,
        side: TransferSide.client,
        ...option,
        features: {
            defaultTransfer: useSimpleJson({
                mapping: (value, context) => mapRequestValue(value, context)
            }),
            ...option.features
        },
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
    } as MqttClientOptions;
    config.providers ??= [];
    config.providers.push(
        { provide: MQTT_CLIENT_OPTIONS, useValue: config },
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);

    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({
            provide: backendToken,
            useFactory: () => createMqttClientBackend(config),
            multi: true
        }),
        {
            provide: hanlderToken,
            useFactory: (injector: Injector) => {
                return createRequestHandler(injector, config)
            },
            deps: [
                Injector
            ]
        },
        {
            provide: clientToken,
            useFactory: (injector: Injector) => {
                const handler = injector.get(hanlderToken);
                const childInjector = createInjector(injector, {
                    providers: [
                        { provide: MQTT_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        MqttClient
                    ]
                });
                return childInjector.get(MqttClient);
            },
            deps: [Injector]
        }
    ];

    if (asDefault) {
        providers.push({
            provide: MqttClient,
            useExisting: clientToken
        }, {
            provide: PatternFormatter,
            useValue: config.formatter ?? defaultFormatter
        })
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;

}

export function withMqttTransport(...options: Partial<MqttClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        const asDefault = option.asDefault ?? (idx === 0);
        return mqttClientTransportFactory(option, asDefault);
    });
}

function createMqttClientBackend(config: MqttClientOptions) {
    return (input: any, context: any) => new Observable<any>((observer) => {
        const client = context.get(SOCKET) as mqtt.MqttClient | undefined;
        const request = context.get(REQUEST) as MqttRequest<any> | undefined;
        if (!client || !request) {
            observer.error(new Error('MQTT client context is incomplete'));
            return;
        }

        const topic = request.url;
        const requestId = request.id ?? `${Date.now()}-${Math.random()}`;
        const responseTopic = request.responseTopic ?? config.responseTopic ?? `${topic}/response`;
        const formatter = context.get(PatternFormatter, defaultFormatter);
        const payload = Buffer.isBuffer(input)
            ? input
            : JSON.stringify(serializeRequest({ ...request, id: requestId }, formatter, 'payload'));
        let timer: NodeJS.Timeout | undefined;
        let closed = false;

        const cleanup = () => {
            if (closed) return;
            closed = true;
            client.off(Events.MESSAGE, onMessage);
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
            unsubscribeTopic(client, responseTopic).catch(() => undefined);
        };

        const onMessage = (receivedTopic: string, message: Buffer) => {
            if (receivedTopic !== responseTopic) return;
            const parsed = parseReply(message.toString(), request, requestId);
            if (!parsed) return;
            if (request.observe === 'observe') {
                if (parsed instanceof ErrorResponse) {
                    cleanup();
                    observer.error(parsed);
                    return;
                }
                observer.next(parsed.body ?? parsed.payload ?? parsed);
                return;
            }
            cleanup();
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
        };

        if (request.observe === 'events') {
            publishMessage(client, topic, payload)
                .then(() => {
                    observer.next({ type: 0 } as ResponseEventPacket);
                    observer.complete();
                })
                .catch(err => observer.error(err));
            return cleanup;
        }

        client.on(Events.MESSAGE, onMessage);
        subscribeTopic(client, responseTopic, normalizeSubscribeOptions(config.subscribeOpts))
            .then(() => publishMessage(client, topic, payload))
            .then(() => {
                if (request.observe === 'observe') {
                    return;
                }
                timer = setTimeout(() => {
                    cleanup();
                    observer.error(new Error('Timeout has occurred'));
                }, request.timeout ?? 10000);
            })
            .catch(err => {
                cleanup();
                observer.error(err);
            });

        return cleanup;
    });
}

function mapRequestValue(value: any, context: any) {
    if (value && typeof value === 'object' && ('url' in value || 'topic' in value || 'pattern' in value)) {
        return serializeRequest(value, context.get(PatternFormatter) ?? defaultFormatter, 'payload');
    }
    return value;
}

function serializeRequest(request: any, formatter: PatternFormatter, payloadKey: 'body' | 'payload') {
    const json: Record<string, any> = {};
    if (request.url) {
        const fullUrl = typeof request.getUrlWithParams === 'function' ? request.getUrlWithParams() : request.url;
        const [url, rawQuery] = String(fullUrl).split('?', 2);
        json.url = url;
        if (rawQuery) {
            json.query = parseQueryString(rawQuery);
        }
    }
    if (request.topic) {
        json.topic = request.topic;
    }
    if (request.responseTopic) {
        json.responseTopic = request.responseTopic;
    }
    if (request.id !== undefined && request.id !== null) {
        json.id = request.id;
    }
    if (request.pattern) {
        json.pattern = formatter ? formatter.format(request.pattern) : request.pattern;
    }
    if (request.method) {
        json.method = request.method;
    }
    if (request.headers?.size) {
        json.headers = request.headers.getHeaders();
    }
    if (request.params) {
        json.params = typeof request.params?.toRecord === 'function' ? request.params.toRecord() : request.params;
    }
    if (request.query && !json.query) {
        json.query = request.query;
    }
    if (request.body !== undefined && request.body !== null) {
        json[payloadKey] = request.body;
    }
    return json;
}

function normalizeSubscribeOptions(options?: MqttClientOptions['subscribeOpts']): mqtt.IClientSubscribeOptions {
    return { qos: options?.qos ?? 0 };
}

function subscribeTopic(client: mqtt.MqttClient, topic: string, options: mqtt.IClientSubscribeOptions): Promise<void> {
    return new Promise((resolve, reject) => {
        client.subscribe(topic, options, (err: Error | null) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function unsubscribeTopic(client: mqtt.MqttClient, topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
        client.unsubscribe(topic, (err: Error | null) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function publishMessage(client: mqtt.MqttClient, topic: string, payload: string | Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
        client.publish(topic, payload, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function parseReply(message: string, request: MqttRequest<any>, requestId: string | number) {
    let parsed: any = message;
    try {
        parsed = JSON.parse(message);
    } catch {
        parsed = message;
    }
    if (parsed && typeof parsed === 'object' && parsed.id != null && parsed.id !== requestId) {
        return null;
    }
    const normalized = normalizeResponse(parsed);
    if (request.observe === 'response') {
        return normalized;
    }
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
