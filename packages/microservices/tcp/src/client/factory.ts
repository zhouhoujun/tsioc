import { Injector, asProvider } from '@tsdi/ioc';
import { PatternFormatter, TransferSide, Transport } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { createClientTransportFeature, getClientBackendToken, wrapClientBackendWithTransfer, ClientTransportFeature } from '@tsdi/client';
import { TCP_CLIENT_OPTIONS, TcpClientOptions } from './options';
import { TcpClient } from './client';
import { TcpMicroPatternFormatter } from '../pattern-formatter';

export function tcpClientTransportFactory(option: Partial<TcpClientOptions>, asDefault?: boolean): ClientTransportFeature {
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
    const backendToken = getClientBackendToken(config);
    const defaultProviders = [];
    if (config.formatter) {
        defaultProviders.push({
            provide: PatternFormatter,
            useFactory: (injector: Injector) => injector.get(config.formatter!),
            deps: [Injector]
        });
    }
    return createClientTransportFeature({
        config,
        asDefault,
        optionToken: TCP_CLIENT_OPTIONS,
        clientType: TcpClient,
        backendProvider: asProvider({
            provide: backendToken,
            useFactory: (injector: Injector) => wrapClientBackendWithTransfer(injector, config, createSendMessageBackend()),
            deps: [Injector],
            multi: true
        }),
        defaultProviders
    });
}

export function withTcpTransport(...options: Partial<TcpClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        const asDefault = option.asDefault ?? (idx === 0);
        return tcpClientTransportFactory(option, asDefault);
    });
}
