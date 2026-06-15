import { asProvider, createInjector, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, PatternFormatter, TransferSide, Transport } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { TCP_CLIENT_OPTIONS, TcpClientOptions } from './options';
import { TcpClient } from './client';
import { TcpMicroPatternFormatter } from '../pattern-formatter';


function tcpClientTransportFacotry(option: Partial<TcpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.TCP,
        side: TransferSide.client,
        formatter: option.microservice === false ? (option as any).formatter : ((option as any).formatter ?? TcpMicroPatternFormatter),
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
            ...option.features
        },
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
    } as TcpClientOptions;
    config.providers ??= [];
    config.providers.push(
        { provide: TCP_CLIENT_OPTIONS, useValue: config },
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
                        { provide: TCP_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        TcpClient
                    ]
                });
                return childInjector.get(TcpClient);
            },
            deps: [
                Injector
            ]
        }
    ];

    if (asDefault) {
        providers.push({
            provide: TcpClient,
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

export function withTcpTransport(...options: Partial<TcpClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        // First option is default unless explicitly specified
        const asDefault = option.asDefault ?? (idx === 0);
        return tcpClientTransportFacotry(option, asDefault);
    });
}
