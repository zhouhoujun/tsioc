import { Provider, getClassRef, Injector, importProvidersFrom, toProvider } from '@tsdi/ioc';
import { NotFoundException, RequestContext, StatusMessageAdapter, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { of } from 'rxjs';
import { MqttServer } from './mqtt-server';
import { MqttServOptions, MQTT_SERV_OPTIONS } from './options';
import { ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { MqttMessageAdapter } from './message-adapter';
import { MqttMessageAdapterFactory } from './message-adapter.factory';

export function mqttTransportFactory(option: Partial<MqttServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.MQTT,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            ...option.features
        },
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
        subscribeTopics: option.subscribeTopics ? [...option.subscribeTopics] : undefined,
    } as MqttServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config);
    getServiceFiltersToken(config);
    getServiceGuardsToken(config);

    config.providers ??= [];
    config.providers.push(
        { provide: MQTT_SERV_OPTIONS, useValue: config },
    );

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        MqttMessageAdapter,
        MqttMessageAdapterFactory,
        {
            provide: backendToken,
            useValue: (_req: any, context: RequestContext): any => {
                const adapter = context.get(StatusMessageAdapter);
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
                return getClassRef(MqttServer).createInvocation(injector, {
                    providers: [
                        { provide: MQTT_SERV_OPTIONS, useValue: config },
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

export function useMqttTransport(...options: Partial<MqttServOptions>[]): ServiceTransportFeature[] {
    return options.map(o => mqttTransportFactory(o, o.asDefault ?? (options.length === 1)));
}
