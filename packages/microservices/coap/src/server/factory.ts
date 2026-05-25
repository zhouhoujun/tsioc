import { Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { MessageReaderFactory } from '@tsdi/core';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, StatusAdapter, RequestContext, createRequestHandler, Transport, TransferSide, IncomingMessageReaderFactory } from '@tsdi/common';
import { of } from 'rxjs';
import { CoapServer } from './coap-server';
import { CoapCompatiblePatternFormatter, CoapPatternFormatter } from './pattern';
import { CoapServOptions, COAP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { useJsonPacket } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';

export function coapTransportFactory(option: Partial<CoapServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.CoAP,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
            ...option.features,
            router: option.features?.router === false ? false : {
                ...(typeof option.features?.router === 'object' ? option.features.router : {}),
                formatter: (typeof option.features?.router === 'object' && option.features.router.formatter)
                    || (option.compatibility ? CoapCompatiblePatternFormatter : CoapPatternFormatter)
            }
        },
        listenOpts: option.listenOpts ? { ...option.listenOpts } : undefined,
    } as CoapServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config);
    getServiceFiltersToken(config);
    getServiceGuardsToken(config);

    config.providers ??= [];
    config.features.messagerReaderFactory ??= IncomingMessageReaderFactory;
    config.providers.push(
        { provide: COAP_SERV_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
    );

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        CoapPatternFormatter,
        CoapCompatiblePatternFormatter,
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        {
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
        },
        {
            provide: serviceToken,
            useFactory: (injector: Injector) => {
                return getClassRef(CoapServer).createInvocation(injector, {
                    providers: [
                        { provide: COAP_SERV_OPTIONS, useValue: config },
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

export function withCoapTransport(...options: Partial<CoapServOptions>[]): ServiceTransportFeature[] {
    return options.map(option => {
        return coapTransportFactory(option, options.length === 1 && option.asDefault);
    });
}
