import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, Events } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature, wrapClientBackendWithTransfer } from '@tsdi/client';
import { UDP_CLIENT_OPTIONS, UdpClientOptions } from './options';
import { UdpClient } from './client';
import { UdpMicroPatternFormatter } from '../pattern-formatter';

function udpClientTransportFactory(option: Partial<UdpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.UDP, side: TransferSide.client,
        formatter: option.microservice === false ? (option as any).formatter : ((option as any).formatter ?? UdpMicroPatternFormatter),
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
        asProvider({
            provide: backendToken,
            useFactory: (injector: Injector) => wrapClientBackendWithTransfer(injector, config, createSendMessageBackend(Events.MESSAGE)),
            deps: [Injector],
            multi: true
        }),
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

    if (asDefault) {
        providers.push({ provide: UdpClient, useExisting: clientToken });
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

export function withUdpTransport(...options: Partial<UdpClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => udpClientTransportFactory(option, option.asDefault ?? (idx === 0)));
}
