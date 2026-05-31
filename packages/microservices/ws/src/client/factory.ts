import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter } from '@tsdi/common';
import { createSendMessageBackend } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { WS_CLIENT_OPTIONS, WsClientOptions } from './options';
import { WsClient } from './client';
import { useWsPacket } from '../transfer';


function wsClientTransportFactory(option: Partial<WsClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.WS,
        side: TransferSide.client,
        ...option,
        features: {
            defaultTransfer: useWsPacket(),
            ...option.features
        },
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
    } as WsClientOptions;
    config.providers ??= [];
    config.providers.push(
        { provide: WS_CLIENT_OPTIONS, useValue: config },
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
                        { provide: WS_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        { provide: PatternFormatter, useValue: defaultFormatter },
                        WsClient
                    ]
                });
                return childInjector.get(WsClient);
            },
            deps: [Injector]
        }
    ];

    if (asDefault) {
        providers.push(
            { provide: WsClient, useExisting: clientToken },
            { provide: PatternFormatter, useValue: defaultFormatter }
        )
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;

}

export function withWsTransport(...options: Partial<WsClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        // First option is default unless explicitly specified
        const asDefault = option.asDefault ?? (idx === 0);
        return wsClientTransportFactory(option, asDefault);
    });
}
