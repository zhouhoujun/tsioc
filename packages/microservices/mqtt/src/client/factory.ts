import { asProvider, Injector, Provider, toProvider } from '@tsdi/ioc';
import { AbstractRequest, createRequestHandler, Events, IncomingMessageReaderFactory, PatternFormatter, REQUEST, TransferSide, Transport, defaultFormatter, useSimpleJson } from '@tsdi/common';
import { SOCKET } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { resolveClientMessageReaderFactory } from '@tsdi/client';
import { MQTT_CLIENT_OPTIONS, MqttClientOptions } from './options';
import { MqttClient } from './client';
import { MqttRequest } from './request';
import { MessageReaderFactory } from '@tsdi/core';
import { Observable } from 'rxjs';
import * as mqtt from 'mqtt';


function mqttClientTransportFactory(option: Partial<MqttClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.MQTT,
        side: TransferSide.client,
        ...option,
        features: {
            defaultTransfer: useSimpleJson({
                mapping: (value, context) => {
                    if (value instanceof AbstractRequest) {
                        return value.toJson({
                            formatter: context.get(PatternFormatter) ?? defaultFormatter,
                            payloadKey: 'payload'
                        });
                    }
                    return value;
                }
            }),
            ...option.features
        },
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
    } as MqttClientOptions;
    config.providers ??= [];
    config.features.messageReaderFactory = resolveClientMessageReaderFactory(option, IncomingMessageReaderFactory);
    config.features.messagerReaderFactory = config.features.messageReaderFactory;
    config.providers.push(
        { provide: MQTT_CLIENT_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messageReaderFactory),
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
            useFactory: (handler: ClientHandler<any, any>) => {
                return new MqttClient(handler, config);
            },
            deps: [
                hanlderToken
            ]
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
            : JSON.stringify(request.toJson({ formatter, payloadKey: 'payload' }));
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

function subscribeTopic(client: mqtt.MqttClient, topic: string, options: { qos?: 0 | 1 | 2 }) {
    const subscribeOptions: mqtt.IClientSubscribeOptions = { qos: options.qos ?? 0 };
    return new Promise<void>((resolve, reject) => {
        client.subscribe(topic, subscribeOptions, (err?: Error | null) => err ? reject(err) : resolve());
    });
}

function unsubscribeTopic(client: mqtt.MqttClient, topic: string) {
    return new Promise<void>((resolve, reject) => {
        client.unsubscribe(topic, (err?: Error | null) => err ? reject(err) : resolve());
    });
}

function publishMessage(client: mqtt.MqttClient, topic: string, payload: string | Buffer) {
    return new Promise<void>((resolve, reject) => {
        client.publish(topic, payload, (err?: Error | null) => err ? reject(err) : resolve());
    });
}
