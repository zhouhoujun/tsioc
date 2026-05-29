import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { NATS_CLIENT_OPTIONS, NatsClientOptions } from './options';
import { NatsClient } from './client';
import { NatsPatternFormatter } from '../server';


function natsClientTransportFactory(option: Partial<NatsClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.NATS,
        side: TransferSide.client,
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
            ...option.features
        },
        servers: option.servers ? [...option.servers] : undefined,
    } as NatsClientOptions;
    config.formatter ??= NatsPatternFormatter;
    config.providers ??= [];
    config.providers.push(
        { provide: NATS_CLIENT_OPTIONS, useValue: config },
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
            useFactory: (injector: Injector) => {
                const handler = injector.get(hanlderToken);
                const childInjector = createInjector(injector, {
                    providers: [
                        { provide: NATS_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        NatsClient
                    ]
                });
                return childInjector.get(NatsClient);
            },
            deps: [Injector]
        }
    ];

    if (asDefault) {
        providers.push({
            provide: NatsClient,
            useExisting: clientToken
        });
        if (config.formatter) {
            providers.push({
                provide: PatternFormatter,
                useFactory: (injector: Injector) => injector.get(config.formatter!),
                deps: [Injector]
            });
        }
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;

}

export function withNatsTransport(...options: Partial<NatsClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        const asDefault = option.asDefault ?? (idx === 0);
        return natsClientTransportFactory(option, asDefault);
    });
}
