import { importProvidersFrom } from '@tsdi/ioc';
import { NotFoundException, RequestContext, RequestFilterLike, StatusMessageAdapter, Transport, TransferSide } from '@tsdi/common';
import { of } from 'rxjs';
import { McpServer } from './mcp-server';
import { McpServOptions, MCP_SERV_OPTIONS } from './options';
import { createServiceTransportFeature, getServiceBackendToken, ServiceTransportFeature } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { McpMessageAdapter } from './message-adapter';
import { McpMessageAdapterFactory } from './message-adapter.factory';
import { McpTransportSenderFilter } from './sender-filter';
import { McpEnsureAdapterFilter } from './ensure-adapter';

const useMcpTransfer = () => () => ({
    filters: [
        McpEnsureAdapterFilter as unknown as RequestFilterLike,
        McpTransportSenderFilter as unknown as RequestFilterLike
    ]
});

export function mcpTransportFactory(option: Partial<McpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.MCP, side: TransferSide.server, microservice: true,
        ...option,
        features: { defaultTransfer: useMcpTransfer(), ...option.features },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
    } as McpServOptions;

    const backendToken = getServiceBackendToken(config);
    const backendProvider = {
        provide: backendToken,
        useValue: (_req: any, context: RequestContext): any => {
            const adapter = context.get(StatusMessageAdapter);
            const error = new NotFoundException('Not Found', 404);
            if (adapter) {
                adapter.setStatus(error.statusCode, error.message)
                    .setError(error)
                    .setPayload({ statusCode: error.statusCode, statusMessage: error.message });
                return of(adapter);
            }
            return of(null);
        },
        multi: true
    };

    return createServiceTransportFeature({
        config,
        asDefault,
        optionToken: MCP_SERV_OPTIONS,
        serverType: McpServer,
        providers: [
            importProvidersFrom(ServerCommonModule),
            McpEnsureAdapterFilter,
            McpMessageAdapter,
            McpMessageAdapterFactory
        ],
        backendProvider
    });
}

export function useMcpTransport(...options: Partial<McpServOptions>[]): ServiceTransportFeature[] {
    return options.map((o, i) => mcpTransportFactory(o, o.asDefault ?? (options.length === 1 && i === 0)));
}
