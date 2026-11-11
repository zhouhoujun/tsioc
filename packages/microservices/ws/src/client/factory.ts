import { Injector, asProvider } from '@tsdi/ioc';
import { createSendMessageBackend } from '@tsdi/transport';
import { PatternFormatter, defaultFormatter, Transport, TransferSide } from '@tsdi/common';
import { createClientTransportFeature, getClientBackendToken, wrapClientBackendWithTransfer, ClientTransportFeature } from '@tsdi/client';
import { WS_CLIENT_OPTIONS, WsClientOptions } from './options';
import { WsClient } from './client';
import { useWsPacket } from '../transfer';

export function wsClientTransportFactory(option: Partial<WsClientOptions>, asDefault?: boolean): ClientTransportFeature {
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
    const backendToken = getClientBackendToken(config);
    return createClientTransportFeature({
        config,
        asDefault,
        optionToken: WS_CLIENT_OPTIONS,
        clientType: WsClient,
        backendProvider: asProvider({
            provide: backendToken,
            useFactory: (injector: Injector) => wrapClientBackendWithTransfer(injector, config, createSendMessageBackend()),
            deps: [Injector],
            multi: true
        }),
        childProviders: [{ provide: PatternFormatter, useValue: defaultFormatter }],
        defaultProviders: [{ provide: PatternFormatter, useValue: defaultFormatter }]
    });
}

export function withWsTransport(...options: Partial<WsClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        const asDefault = option.asDefault ?? (idx === 0);
        return wsClientTransportFactory(option, asDefault);
    });
}
