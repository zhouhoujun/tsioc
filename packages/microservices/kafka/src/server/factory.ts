import { Provider, getClassRef, Injector, importProvidersFrom } from '@tsdi/ioc';
import { NotFoundException, RequestContext, StatusMessageAdapter, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { of } from 'rxjs';
import { KafkaServer } from './kafka-server';
import { KafkaPatternFormatter } from './pattern';
import { KafkaServOptions, KAFKA_SERV_OPTIONS } from './options';
import { AuthInterceptor, MessageAuthInterceptor, ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { useJsonPacket } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { KafkaMessageAdapter } from './message-adapter';
import { KafkaMessageAdapterFactory } from './message-adapter.factory';

export function kafkaTransportFactory(option: Partial<KafkaServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.Kafka, side: TransferSide.server, microservice: true,
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
            ...option.features,
            router: option.features?.router === false ? false : {
                ...(typeof option.features?.router === 'object' ? option.features.router : {}),
                formatter: (typeof option.features?.router === 'object' && option.features.router.formatter) || KafkaPatternFormatter
            }
        },
        brokers: option.brokers ? [...option.brokers] : undefined,
        topics: option.topics ? [...option.topics] : undefined,
    } as KafkaServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config); getServiceFiltersToken(config); getServiceGuardsToken(config);

    config.providers ??= [];
    config.providers.push(
        { provide: KAFKA_SERV_OPTIONS, useValue: config },
    );
    const authProviders: Provider[] = config.features.auth ? [{
        provide: getServiceInterceptorsToken(config),
        useExisting: MessageAuthInterceptor,
        multi: true,
        multiOrder: -300
    } as Provider & { multiOrder: number }] : [];

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        KafkaPatternFormatter,
        KafkaMessageAdapter,
        KafkaMessageAdapterFactory,
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
        { provide: serviceToken, useFactory: (inj: Injector) => getClassRef(KafkaServer).createInvocation(inj, {
            providers: [{ provide: KAFKA_SERV_OPTIONS, useValue: config }, { provide: ServiceHandler, useFactory: (i: Injector) => createRequestHandler(i, config), deps: [Injector] }]
        }), deps: [Injector] },
        { provide: REGISTER_MICRO_SERVICES, useFactory: (s) => ({ service: s, bootstrap: config.bootstrap, microservice: config.microservice, asDefault }), deps: [serviceToken], multi: true }
    ];
    return { kind: ServiceFeatureKind.Transport, config, providers };
}

export function useKafkaTransport(...options: Partial<KafkaServOptions>[]): ServiceTransportFeature[] {
    return options.map(o => kafkaTransportFactory(o, o.asDefault ?? (options.length === 1)));
}
