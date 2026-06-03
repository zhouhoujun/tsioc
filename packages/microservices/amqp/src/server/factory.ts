import { Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { NotFoundException, RequestContext, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { of } from 'rxjs';
import { AmqpServer } from './amqp-server';
import { AmqpPatternFormatter } from './pattern';
import { AmqpServOptions, AMQP_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { RequestInterceptorFn } from '@tsdi/common';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { AmqpMessageAdapter } from './message-adapter';
import { AmqpMessageAdapterFactory } from './message-adapter.factory';

const useAmqpMessage = () => ((_req, next, context) => next(_req, context)) as RequestInterceptorFn;

export function amqpTransportFactory(option: Partial<AmqpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.AMQP,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useAmqpMessage,
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
    config.providers.push(
        { provide: AMQP_SERV_OPTIONS, useValue: config },
    );

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        AmqpPatternFormatter,
        AmqpMessageAdapter,
        AmqpMessageAdapterFactory,
        {
            provide: backendToken,
            useValue: (_req: any, context: RequestContext): any => {
                const adapter = context.getMessageAdapter() as AmqpMessageAdapter | null;
                const error = new NotFoundException('Not Found', 404);
                if (adapter) {
                    adapter.writeError(error);
                    adapter.setStatus(error.statusCode, error.message);
                    adapter.write({ statusCode: error.statusCode, statusMessage: error.message });
                    return of(adapter);
                }
                return of(null);
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
