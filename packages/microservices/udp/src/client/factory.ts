import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, Events } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { UDP_CLIENT_OPTIONS, UdpClientOptions } from './options';
import { UdpClient } from './client';

function udpClientTransportFactory(option: Partial<UdpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.UDP, side: TransferSide.client,
        ...option,
        features: { defaultTransfer: useJsonPacket({ eventName: Events.MESSAGE }), ...option.features },
    } as UdpClientOptions;
    config.providers ??= [];
    config.providers.push(
        { provide: UDP_CLIENT_OPTIONS, useValue: config },
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);

    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({ provide: backendToken, useFactory: createSendMessageBackend, multi: true }),
        { provide: hanlderToken, useFactory: (injector: Injector) => createRequestHandler(injector, config), deps: [Injector] },
        {
            provide: clientToken,
            useFactory: (injector: Injector) => {
                const handler = injector.get(hanlderToken);
                const childInjector = createInjector(injector, {
                    providers: [
                        { provide: UDP_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        UdpClient
                    ]
                });
                return childInjector.get(UdpClient);
            },
            deps: [Injector]
        }
    ];

    if (asDefault) providers.push(
        { provide: UdpClient, useExisting: clientToken },
        { provide: PatternFormatter, useValue: defaultFormatter }
    );
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}

export function withUdpTransport(...options: Partial<UdpClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => udpClientTransportFactory(option, option.asDefault ?? (idx === 0)));
}
