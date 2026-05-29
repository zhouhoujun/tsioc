import { asProvider, Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, RequestContext, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { RESPONSE } from '@tsdi/common'
import { of } from 'rxjs';
import { TcpServer } from './tcp-server';
import { TcpServOptions, TCP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { useJsonPacket } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';

/**
 * create TCP transport feature for microservice.
 */
export function tcpTransportFactory(option: Partial<TcpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.TCP,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
            ...option.features
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
        serverOpts: option.serverOpts ? { ...option.serverOpts } : undefined,
    } as TcpServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config);
    getServiceFiltersToken(config);
    getServiceGuardsToken(config);

    config.providers ??= [];
    config.providers.push(
        { provide: TCP_SERV_OPTIONS, useValue: config },
    );

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        asProvider({
            provide: backendToken,
            useValue: (_req: any, context: RequestContext): any => {
                const response = context.get(RESPONSE);
                const error = new NotFoundException('Not Found', 404);
                response.error = error;
                response.statusCode = error.statusCode;
                response.statusMessage = error.message;
                return of(response);
            },
            multi: true
        }),

        {
            provide: serviceToken,
            useFactory: (injector: Injector) => {
                return getClassRef(TcpServer).createInvocation(injector, {
                    providers: [
                        { provide: TCP_SERV_OPTIONS, useValue: config },
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

export function useTcpTransport(...options: Partial<TcpServOptions>[]): ServiceTransportFeature[] {
    return options.map(option => {
        return tcpTransportFactory(option, options.length === 1 && option.asDefault);
    });
}
