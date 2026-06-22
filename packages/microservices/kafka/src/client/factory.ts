import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { KAFKA_CLIENT_OPTIONS, KafkaClientOptions } from './options';
import { KafkaClient } from './client';
import { KafkaPatternFormatter } from '../server';

function kafkaClientTransportFactory(option: Partial<KafkaClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.Kafka, side: TransferSide.client,
        ...option, features: { defaultTransfer: useJsonPacket(), ...option.features },
        brokers: option.brokers ? [...option.brokers] : undefined,
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
        asProvider({ provide: backendToken, useFactory: createSendMessageBackend, multi: true }),
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
