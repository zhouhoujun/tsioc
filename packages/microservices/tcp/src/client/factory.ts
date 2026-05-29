import { asProvider, getClassRef, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { TCP_CLIENT_OPTIONS, TcpClientOptions } from './options';
import { TcpClient } from './client';


function tcpClientTransportFacotry(option: Partial<TcpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.TCP,
        side: TransferSide.client,
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
                return getClassRef(TcpClient).createInvocation(injector, {
                    providers: [
                        { provide: TCP_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler }
                    ]
                }).instance;
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
        })
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
