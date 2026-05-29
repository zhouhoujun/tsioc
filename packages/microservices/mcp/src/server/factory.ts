import { Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { MessageReaderFactory } from '@tsdi/core';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, RequestContext, createRequestHandler, Transport, TransferSide, IncomingMessageReaderFactory } from '@tsdi/common';
import { of } from 'rxjs';
import { McpServer } from './mcp-server';
import { McpServOptions, MCP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { useJsonPacket } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';

export function mcpTransportFactory(option: Partial<McpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.MCP, side: TransferSide.server, microservice: true,
        ...option,
        features: { defaultTransfer: useJsonPacket(), ...option.features },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
    } as McpServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config); getServiceFiltersToken(config); getServiceGuardsToken(config);

    config.providers ??= [];
    config.features.messagerReaderFactory ??= IncomingMessageReaderFactory;
    config.providers.push(
        { provide: MCP_SERV_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
    );

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        { provide: backendToken, useValue: (_req: any, context: RequestContext): any => {
            const r = context.getResponse();
            const error = new NotFoundException('Not Found', 404);
            r.error = error; r.statusCode = error.statusCode; r.statusMessage = error.message; return of(r);
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
