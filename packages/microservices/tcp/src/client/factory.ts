import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { TcpClientOptions } from './options';
import { createRequestHandler, TransferSide, Transport } from '@tsdi/common';
import { asProvider, Injector, Provider } from '@tsdi/ioc';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { TcpRequest } from './request';
import { TcpClient } from './client';

export function tcpClientTransportFacotry(option: Partial<TcpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
            ...option.features
        },
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
    } as TcpClientOptions;
    config.transport = Transport.TCP;
    config.side = TransferSide.client;
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
                return new TcpClient(handler, config);
            },
            deps: [
                hanlderToken
            ]
        }
    ];

    if (asDefault) {
        providers.push({
            provide: TcpClient,
            useExisting: clientToken
        })
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;

}

export function withTcpClientTransport(...options: Partial<TcpClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        // First option is default unless explicitly specified
        const asDefault = option.asDefault ?? (idx === 0);
        return tcpClientTransportFacotry(option, asDefault);
    });
}
