import { asProvider, Injector, Provider, toProvider } from '@tsdi/ioc';
import { createRequestHandler, IncomingMessageReaderFactory, TransferSide, Transport } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { KAFKA_CLIENT_OPTIONS, KafkaClientOptions } from './options';
import { KafkaClient } from './client';
import { MessageReaderFactory } from '@tsdi/core';

function kafkaClientTransportFactory(option: Partial<KafkaClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.Kafka, side: TransferSide.client,
        ...option, features: { defaultTransfer: useJsonPacket(), ...option.features },
        brokers: option.brokers ? [...option.brokers] : undefined,
    } as KafkaClientOptions;
    config.providers ??= [];
    config.features.messagerReaderFactory ??= IncomingMessageReaderFactory;
    config.providers.push(
        { provide: KAFKA_CLIENT_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);
    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({ provide: backendToken, useFactory: createSendMessageBackend, multi: true }),
        { provide: hanlderToken, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] },
        { provide: clientToken, useFactory: (h: ClientHandler<any, any>) => new KafkaClient(h, config), deps: [hanlderToken] }
    ];
    if (asDefault) providers.push({ provide: KafkaClient, useExisting: clientToken });
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}

export function withKafkaClientTransport(...options: Partial<KafkaClientOptions>[]): ClientTransportFeature[] {
    return options.map((o, i) => kafkaClientTransportFactory(o, o.asDefault ?? (i === 0)));
}
