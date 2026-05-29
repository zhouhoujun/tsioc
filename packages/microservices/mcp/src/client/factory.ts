import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { MCP_CLIENT_OPTIONS, McpClientOptions } from './options';
import { McpClient } from './client';

function mcpClientTransportFactory(option: Partial<McpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.MCP, side: TransferSide.client,
        ...option, features: { defaultTransfer: useJsonPacket(), ...option.features },
    } as McpClientOptions;
    config.providers ??= [];
    config.providers.push(
        { provide: MCP_CLIENT_OPTIONS, useValue: config },
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);
    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({ provide: backendToken, useFactory: createSendMessageBackend, multi: true }),
        { provide: hanlderToken, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] },
        {
            provide: clientToken,
            useFactory: (injector: Injector) => {
                const handler = injector.get(hanlderToken);
                const childInjector = createInjector(injector, {
                    providers: [
                        { provide: MCP_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        McpClient
                    ]
                });
                return childInjector.get(McpClient);
            },
            deps: [Injector]
        }
    ];
    if (asDefault) providers.push({ provide: McpClient, useExisting: clientToken });
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}

export function withMcpTransport(...options: Partial<McpClientOptions>[]): ClientTransportFeature[] {
    return options.map((o, i) => mcpClientTransportFactory(o, o.asDefault ?? (i === 0)));
}
