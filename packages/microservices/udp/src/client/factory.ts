import { asProvider, Injector, Provider, toProvider } from '@tsdi/ioc';
import { createRequestHandler, IncomingMessageReaderFactory, TransferSide, Transport } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { resolveClientMessageReaderFactory } from '@tsdi/client';
import { UDP_CLIENT_OPTIONS, UdpClientOptions } from './options';
import { UdpClient } from './client';
import { MessageReaderFactory } from '@tsdi/core';

function udpClientTransportFactory(option: Partial<UdpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.UDP, side: TransferSide.client,
        ...option,
        features: { defaultTransfer: useJsonPacket(), ...option.features },
    } as UdpClientOptions;
    config.providers ??= [];
    config.features.messageReaderFactory = resolveClientMessageReaderFactory(option, IncomingMessageReaderFactory);
    config.features.messagerReaderFactory = config.features.messageReaderFactory;
    config.providers.push(
        { provide: UDP_CLIENT_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messageReaderFactory),
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);

    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({ provide: backendToken, useFactory: createSendMessageBackend, multi: true }),
        { provide: hanlderToken, useFactory: (injector: Injector) => createRequestHandler(injector, config), deps: [Injector] },
        { provide: clientToken, useFactory: (handler: ClientHandler<any, any>) => new UdpClient(handler, config), deps: [hanlderToken] }
    ];

    if (asDefault) providers.push({ provide: UdpClient, useExisting: clientToken });
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}

export function withUdpTransport(...options: Partial<UdpClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => udpClientTransportFactory(option, option.asDefault ?? (idx === 0)));
}
