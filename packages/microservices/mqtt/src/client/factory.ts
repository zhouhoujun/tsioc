import { asProvider, Injector, Provider, toProvider } from '@tsdi/ioc';
import { createRequestHandler, IncomingMessageReaderFactory, TransferSide, Transport } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { MQTT_CLIENT_OPTIONS, MqttClientOptions } from './options';
import { MqttClient } from './client';
import { MessageReaderFactory } from '@tsdi/core';


function mqttClientTransportFactory(option: Partial<MqttClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.MQTT,
        side: TransferSide.client,
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
            ...option.features
        },
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
    } as MqttClientOptions;
    config.providers ??= [];
    config.features.messagerReaderFactory ??= IncomingMessageReaderFactory;
    config.providers.push(
        { provide: MQTT_CLIENT_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);

    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({
            provide: backendToken,
            useFactory: createSendMessageBackend,
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
        })
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;

}

export function withMqttClientTransport(...options: Partial<MqttClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        const asDefault = option.asDefault ?? (idx === 0);
        return mqttClientTransportFactory(option, asDefault);
    });
}
