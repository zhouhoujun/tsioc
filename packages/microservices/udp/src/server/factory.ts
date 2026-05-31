import { Provider, getClassRef, Injector, importProvidersFrom } from '@tsdi/ioc';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, RequestContext, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { RESPONSE } from '@tsdi/common'
import { of } from 'rxjs';
import { UdpServer } from './udp-server';
import { UdpServOptions, UDP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';

export function udpTransportFactory(option: Partial<UdpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.UDP,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            ...option.features
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
    } as UdpServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config);
    getServiceFiltersToken(config);
    getServiceGuardsToken(config);

    config.providers ??= [];
    config.providers.push(
        { provide: UDP_SERV_OPTIONS, useValue: config },
    );

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        {
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
        },
        {
            provide: serviceToken,
            useFactory: (injector: Injector) => {
                return getClassRef(UdpServer).createInvocation(injector, {
                    providers: [
                        { provide: UDP_SERV_OPTIONS, useValue: config },
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
            useFactory: (service) => ({ service, bootstrap: config.bootstrap, microservice: config.microservice, asDefault }),
            deps: [serviceToken],
            multi: true
        }
    ];

    return { kind: ServiceFeatureKind.Transport, config, providers };
}

export function useUdpTransport(...options: Partial<UdpServOptions>[]): ServiceTransportFeature[] {
    return options.map(option => udpTransportFactory(option, options.length === 1 && option.asDefault));
}
