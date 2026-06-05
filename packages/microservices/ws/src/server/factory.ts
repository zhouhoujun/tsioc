import { Provider, getClassRef, Injector, importProvidersFrom, toProvider, toProviders, isArray } from '@tsdi/ioc';
import { NotFoundException, RequestContext, StatusMessageAdapter, createRequestHandler, Transport, TransferSide, TransferInterceptorFactory } from '@tsdi/common'
import { of } from 'rxjs';
import { WsServer } from './ws-server';
import { WsServOptions, WS_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, ServiceHandler, REGISTER_MICRO_SERVICES, getServiceTransfersToken } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { useWsPacket } from '../transfer';
import { WsMessageAdapter } from './message-adapter';
import { WsMessageAdapterFactory } from './message-adapter.factory';

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
            defaultTransfer: useWsPacket(),
            ...option.features
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
        serverOpts: option.serverOpts ? { ...option.serverOpts } : undefined,
    } as WsServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    const transfersToken = getServiceTransfersToken(config);


    config.providers ??= [];
    config.providers.push(
        { provide: WS_SERV_OPTIONS, useValue: config },
        { provide: backendToken, useValue: (_req: any, context: RequestContext): any => {
            const adapter = context.get(StatusMessageAdapter);
            const error = new NotFoundException('Not Found', 404);
            if (adapter) {
                adapter.writeError(error);
                adapter.setStatus(error.statusCode, error.message);
                adapter.write({ statusCode: error.statusCode, statusMessage: error.message });
                return of(adapter);
            }
            return of(null);
        }, multi: true },
    );

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
        WsMessageAdapter,
        WsMessageAdapterFactory,
        ...transferProviders,

        {
            provide: serviceToken,
            useFactory: (injector: Injector) => {
                return getClassRef(WsServer).createInvocation(injector, {
                    providers: [
                        { provide: WS_SERV_OPTIONS, useValue: config },
                        { provide: backendToken, useValue: (_req: any, context: RequestContext): any => {
                            const adapter = context.get(StatusMessageAdapter);
                            const error = new NotFoundException('Not Found', 404);
                            if (adapter) {
                                adapter.writeError(error);
                                adapter.setStatus(error.statusCode, error.message);
                                adapter.write({ statusCode: error.statusCode, statusMessage: error.message });
                                return of(adapter);
                            }
                            return of(null);
                        }, multi: true },
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

export function useWsTransport(...options: Partial<WsServOptions>[]): ServiceTransportFeature[] {
    return options.map(option => {
        return wsTransportFactory(option, options.length === 1 && option.asDefault);
    });
}
