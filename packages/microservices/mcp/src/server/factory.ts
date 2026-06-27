import { Provider, getClassRef, Injector, importProvidersFrom } from '@tsdi/ioc';
import { NotFoundException, RequestContext, RequestFilterLike, StatusMessageAdapter, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { of } from 'rxjs';
import { McpServer } from './mcp-server';
import { McpServOptions, MCP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { AuthInterceptor, MessageAuthInterceptor } from '@tsdi/service';
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

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config); getServiceFiltersToken(config); getServiceGuardsToken(config);

    config.providers ??= [];
    config.providers.push(
        { provide: MCP_SERV_OPTIONS, useValue: config },
    );
    const authProviders: Provider[] = config.features.auth ? [{
        provide: getServiceInterceptorsToken(config),
        useExisting: MessageAuthInterceptor,
        multi: true,
        multiOrder: -300
    } as Provider & { multiOrder: number }] : [];

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        McpEnsureAdapterFilter,
        McpMessageAdapter,
        McpMessageAdapterFactory,
        { provide: AuthInterceptor, useClass: MessageAuthInterceptor },
        { provide: MessageAuthInterceptor, useExisting: AuthInterceptor },
        ...authProviders,
        { provide: backendToken, useValue: (_req: any, context: RequestContext): any => {
            const adapter = context.get(StatusMessageAdapter);
            const error = new NotFoundException('Not Found', 404);
            if (adapter) {
                adapter.setStatus(error.statusCode, error.message)
                    .setError(error)
                    .setPayload({ statusCode: error.statusCode, statusMessage: error.message });
                return of(adapter);
            }
            return of(null);
        }, multi: true },
        { provide: serviceToken, useFactory: (inj: Injector) => getClassRef(McpServer).createInvocation(inj, {
            providers: [{ provide: MCP_SERV_OPTIONS, useValue: config }, { provide: ServiceHandler, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] }]
        }), deps: [Injector] },
        { provide: REGISTER_MICRO_SERVICES, useFactory: (s) => ({ service: s, bootstrap: config.bootstrap, microservice: config.microservice, asDefault }), deps: [serviceToken], multi: true }
    ];
    return { kind: ServiceFeatureKind.Transport, config, providers };
}

export function useMcpTransport(...options: Partial<McpServOptions>[]): ServiceTransportFeature[] {
    return options.map((o, i) => mcpTransportFactory(o, o.asDefault ?? (options.length === 1 && i === 0)));
}
