import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, useSimpleJson, REQUEST, Events, parseQueryString } from '@tsdi/common'
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
        const responseTopic = config.responseTopic ?? `${topic}/response`;
        const formatter = context.get(PatternFormatter, defaultFormatter);
        const payload = Buffer.isBuffer(input)
            ? input
            : JSON.stringify(serializeRequest(request, formatter, 'payload'));
        let settled = false;
        let timer: NodeJS.Timeout | undefined;

        const cleanup = () => {
            client.off(Events.MESSAGE, onMessage);
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
            unsubscribeTopic(client, responseTopic).catch(() => undefined);
        };

        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            cleanup();
            fn();
        };

        const onMessage = (receivedTopic: string, message: Buffer) => {
            if (receivedTopic !== responseTopic) return;
            finish(() => {
                const text = message.toString();
                if (request.responseType === 'text') {
                    observer.next(text);
                } else {
                    try {
                        observer.next(JSON.parse(text));
                    } catch {
                        observer.next(text);
                    }
                }
                observer.complete();
            });
        };

        if (request.observe === 'emit') {
            publishMessage(client, topic, payload)
                .then(() => finish(() => observer.complete()))
                .catch(err => finish(() => observer.error(err)));
            return cleanup;
        }

        client.on(Events.MESSAGE, onMessage);
        subscribeTopic(client, responseTopic, config.subscribeOpts ?? { qos: 0 })
            .then(() => publishMessage(client, topic, payload))
            .then(() => {
                timer = setTimeout(() => {
                    finish(() => observer.error(new Error('Timeout has occurred')));
                }, request.timeout ?? 10000);
            })
            .catch(err => finish(() => observer.error(err)));

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
    if (request.id) {
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

function subscribeTopic(client: mqtt.MqttClient, topic: string, options: mqtt.IClientSubscribeOptions): Promise<void> {
    return new Promise((resolve, reject) => {
        client.subscribe(topic, options, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function unsubscribeTopic(client: mqtt.MqttClient, topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
        client.unsubscribe(topic, (err) => {
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
