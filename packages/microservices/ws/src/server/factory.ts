import { asProvider, Provider, getClassRef, Injector, importProvidersFrom, toProvider, toProviders, isArray } from '@tsdi/ioc';
import { MessageReaderFactory } from '@tsdi/core';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, StatusAdapter, RequestContext, createRequestHandler, Transport, TransferSide, IncomingMessageReaderFactory, TransferInterceptorFactory, RequestInterceptorLike } from '@tsdi/common';
import { of } from 'rxjs';
import { WsServer } from './ws-server';
import { WsServOptions, WS_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES, getServiceTransfersToken } from '@tsdi/service';
import { useWsPacket } from '../transfer';
import { ServerCommonModule } from '@tsdi/platform-server/common';

/**
 * Create WebSocket transport feature for microservice.
 * 创建 WebSocket 微服务传输特性
 */
export function wsTransportFactory(option: Partial<WsServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.WS,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            ...option.features,
            defaultTransfer: useWsPacket()
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
        serverOpts: option.serverOpts ? { ...option.serverOpts } : undefined,
    } as WsServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    const interceptorsToken = getServiceInterceptorsToken(config);
    const filtersToken = getServiceFiltersToken(config);
    const guardsToken = getServiceGuardsToken(config);
    const transfersToken = getServiceTransfersToken(config);

    // Copy tokens from features to config root for createRequestHandler to find
    (config as any).backendToken = backendToken;
    (config as any).interceptorsToken = interceptorsToken;
    (config as any).filtersToken = filtersToken;
    (config as any).guardsToken = guardsToken;
    (config as any).transfersToken = transfersToken;

    config.providers ??= [];
    config.features.messagerReaderFactory ??= IncomingMessageReaderFactory;
    config.providers.push(
        { provide: WS_SERV_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
    );

    // Add transfer interceptors providers to main providers array
    const transferProviders: Provider[] = [];
    const transfers: TransferInterceptorFactory[] = [];
    if (config.features.defaultTransfer) {
        transfers.push(config.features.defaultTransfer);
    }
    transfers.forEach((fac) => {
        const itps = fac(config);
        if (isArray(itps)) {
            transferProviders.push(...toProviders(transfersToken, itps, true));
        } else {
            transferProviders.push(toProvider(transfersToken, itps, true));
        }
    });

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        ...transferProviders,
        asProvider({
            provide: backendToken,
            useValue: (_req: any, context: RequestContext): any => {
                const response = context.getResponse();
                const statusAdapter = context.get(StatusAdapter);
                response.error = new NotFoundException();
                if (statusAdapter) {
                    response.statusCode = statusAdapter.notFound;
                    response.statusMessage = response.error.message;
                }
                return of(response);
            },
            multi: true
        }),

        {
            provide: serviceToken,
            useFactory: (injector: Injector) => {
                return getClassRef(WsServer).createInvocation(injector, {
                    providers: [
                        { provide: WS_SERV_OPTIONS, useValue: config },
                        ...transferProviders,
                        {
                            provide: ServiceHandler,
                            useFactory: (inj: Injector) => createRequestHandler(inj, config),
                            deps: [Injector]
                        }
                    ]
                });
            },
            deps: [Injector]
        },
        {
            provide: REGISTER_MICRO_SERVICES,
            useFactory: (service) => {
                return {
                    service,
                    bootstrap: config.bootstrap,
                    microservice: config.microservice,
                    asDefault
                }
            },
            deps: [
                serviceToken
            ],
            multi: true
        }
    ];

    return {
        kind: ServiceFeatureKind.Transport,
        config,
        providers
    };
}

export function withWsTransport(...options: Partial<WsServOptions>[]): ServiceTransportFeature[] {
    return options.map(option => {
        return wsTransportFactory(option, options.length === 1 && option.asDefault);
    });
}
