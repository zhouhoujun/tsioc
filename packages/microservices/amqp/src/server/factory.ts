import { Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { MessageReaderFactory } from '@tsdi/core';
import { UrlOutgoingFactory, OutgoingFactory, NotFoundException, RequestContext, createRequestHandler, Transport, TransferSide, IncomingMessageReaderFactory } from '@tsdi/common';
import { of } from 'rxjs';
import { AmqpServer } from './amqp-server';
import { AmqpPatternFormatter } from './pattern';
import { AmqpServOptions, AMQP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { useJsonPacket } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';

export function amqpTransportFactory(option: Partial<AmqpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.AMQP,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
            ...option.features,
            router: option.features?.router === false ? false : {
                ...(typeof option.features?.router === 'object' ? option.features.router : {}),
                formatter: (typeof option.features?.router === 'object' && option.features.router.formatter) || AmqpPatternFormatter
            }
        },
    } as AmqpServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config);
    getServiceFiltersToken(config);
    getServiceGuardsToken(config);

    config.providers ??= [];
    config.features.messagerReaderFactory ??= IncomingMessageReaderFactory;
    config.providers.push(
        { provide: AMQP_SERV_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
    );

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        AmqpPatternFormatter,
        { provide: OutgoingFactory, useExisting: UrlOutgoingFactory },
        {
            provide: backendToken,
            useValue: (_req: any, context: RequestContext): any => {
                const response = context.getResponse();
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
                return getClassRef(AmqpServer).createInvocation(injector, {
                    providers: [
                        { provide: AMQP_SERV_OPTIONS, useValue: config },
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

export function useAmqpTransport(...options: Partial<AmqpServOptions>[]): ServiceTransportFeature[] {
    return options.map(o => amqpTransportFactory(o, o.asDefault ?? (options.length === 1)));
}
