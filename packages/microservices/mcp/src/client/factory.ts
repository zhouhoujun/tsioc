import { asProvider, Injector, Provider, toProvider } from '@tsdi/ioc';
import { createRequestHandler, IncomingMessageReaderFactory, TransferSide, Transport } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { MCP_CLIENT_OPTIONS, McpClientOptions } from './options';
import { McpClient } from './client';
import { MessageReaderFactory } from '@tsdi/core';

function mcpClientTransportFactory(option: Partial<McpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.MCP, side: TransferSide.client,
        ...option, features: { defaultTransfer: useJsonPacket(), ...option.features },
    } as McpClientOptions;
    config.providers ??= [];
    config.features.messagerReaderFactory ??= IncomingMessageReaderFactory;
    config.providers.push(
        { provide: MCP_CLIENT_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);
    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({ provide: backendToken, useFactory: createSendMessageBackend, multi: true }),
        { provide: hanlderToken, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] },
        { provide: clientToken, useFactory: (h: ClientHandler<any, any>) => new McpClient(h, config), deps: [hanlderToken] }
    ];
    if (asDefault) providers.push({ provide: McpClient, useExisting: clientToken });
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}

export function withMcpClientTransport(...options: Partial<McpClientOptions>[]): ClientTransportFeature[] {
    return options.map((o, i) => mcpClientTransportFactory(o, o.asDefault ?? (i === 0)));
}
