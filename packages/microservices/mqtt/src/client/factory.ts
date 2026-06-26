import { createInjector, asProvider, Injector, Provider, isNil } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, REQUEST, Events, ResponseEventPacket } from '@tsdi/common'
import { SOCKET, useBrokerClientTransfer } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature, wrapClientBackendWithTransfer } from '@tsdi/client';
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
            defaultTransfer: useBrokerClientTransfer<MqttRequest<any>>({
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
            useFactory: (injector: Injector) => wrapClientBackendWithTransfer(injector, config, createMqttClientBackend(config)),
            deps: [Injector],
            multi: true
        }),
        {
            provide: hanlderToken,
            useFactory: (injector: Injector) => createRequestHandler(injector, config),
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

        const topic = request.topic;
        const requestId = request.id ?? `${Date.now()}-${Math.random()}`;
        const responseTopic = request.responseTopic ?? config.responseTopic ?? `${topic}/response`;
        const payload = Buffer.isBuffer(input) || typeof input === 'string'
            ? input
            : JSON.stringify(serializeRequest(request, 'payload', requestId, input));
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
            let parsed: any = message.toString();
            try {
                parsed = JSON.parse(parsed);
            } catch {
                // keep raw string payload
            }
            if (parsed && typeof parsed === 'object' && parsed.id != null && parsed.id !== requestId) return;
            if (request.observe === 'observe') {
                observer.next(parsed);
                return;
            }
            cleanup();
            observer.next(parsed);
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
