import { Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { NotFoundException, RequestContext, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { of } from 'rxjs';
import { NatsServer } from './nats-server';
import { NatsPatternFormatter } from './pattern';
import { NatsServOptions, NATS_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { useJsonPacket } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { NatsMessageAdapter } from './message-adapter';
import { NatsMessageAdapterFactory } from './message-adapter.factory';

export function natsTransportFactory(option: Partial<NatsServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.NATS,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
            ...option.features,
            router: option.features?.router === false ? false : {
                ...(typeof option.features?.router === 'object' ? option.features.router : {}),
                formatter: (typeof option.features?.router === 'object' && option.features.router.formatter) || NatsPatternFormatter
            }
        },
        servers: option.servers ? [...option.servers] : undefined,
        subjects: option.subjects ? [...option.subjects] : undefined,
    } as NatsServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config);
    getServiceFiltersToken(config);
    getServiceGuardsToken(config);

    config.providers ??= [];
    config.providers.push(
        { provide: NATS_SERV_OPTIONS, useValue: config },
    );

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        NatsPatternFormatter,
        NatsMessageAdapter,
        NatsMessageAdapterFactory,
        {
            provide: backendToken,
            useValue: (_req: any, context: RequestContext): any => {
                const adapter = context.getMessageAdapter() as NatsMessageAdapter | null;
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
                return getClassRef(NatsServer).createInvocation(injector, {
                    providers: [
                        { provide: NATS_SERV_OPTIONS, useValue: config },
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

export function useNatsTransport(...options: Partial<NatsServOptions>[]): ServiceTransportFeature[] {
    return options.map(o => natsTransportFactory(o, o.asDefault ?? (options.length === 1)));
}
