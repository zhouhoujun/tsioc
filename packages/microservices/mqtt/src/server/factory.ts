import { Provider, getClassRef, Injector, importProvidersFrom } from '@tsdi/ioc';
import { NotFoundException, RequestContext, REQUEST, StatusMessageAdapter, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { of } from 'rxjs';
import { MqttServer } from './mqtt-server';
import { MqttServOptions, MQTT_SERV_OPTIONS } from './options';
import { AuthInterceptor, MessageAuthInterceptor, ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { MqttMessageAdapter } from './message-adapter';
import { MqttMessageAdapterFactory } from './message-adapter.factory';
import { useBrokerMessageTransfer } from '@tsdi/transport';

const useMqttMessageTransfer = () => useBrokerMessageTransfer<{ topic: string; payload: Buffer }, Record<string, any>>({
    canHandle: (input) => !!input && typeof input.topic === 'string' && Buffer.isBuffer(input.payload),
    normalize: ({ topic, payload }) => {
        const data = payload.toString();
        let parsed: any;
        try {
            parsed = JSON.parse(data);
        } catch {
            parsed = data;
        }

        const requestSource: Record<string, any> = parsed && typeof parsed === 'object' ? parsed : {};
        const url = requestSource.url || '/' + topic.replace(/\//g, '/');
        const method = requestSource.method || 'GET';
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        return {
            ...requestSource,
            url,
            method,
            body,
            payload: body,
            topic,
        };
    },
    adapter: {
        factory: MqttMessageAdapterFactory,
        response: (_input, _requestData, context) => context.getInjector().get(MqttServer).client!
    },
    sender: {
        canSend: (_response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return !!(requestData?.responseTopic ?? (requestData?.topic ? `${requestData.topic}/response` : undefined));
        },
        send: (response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            const client = context.getInjector().get(MqttServer).client;
            const responseTopic = requestData?.responseTopic ?? (requestData?.topic ? `${requestData.topic}/response` : undefined);
            if (!client || !responseTopic || response === undefined) {
                return;
            }
            client.publish(responseTopic, JSON.stringify({ payload: response }));
        },
        canSendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return !!err && !!(requestData?.responseTopic ?? (requestData?.topic ? `${requestData.topic}/response` : undefined));
        },
        sendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            const adapter = context.has(StatusMessageAdapter) ? context.get(StatusMessageAdapter) : null;
            const client = context.getInjector().get(MqttServer).client;
            const responseTopic = requestData?.responseTopic ?? (requestData?.topic ? `${requestData.topic}/response` : undefined);
            if (!client || !responseTopic) {
                return;
            }
            const errorBody = {
                error: err?.message || err?.statusMessage || 'Error',
                statusCode: err?.statusCode || err?.status || 500,
                ...(err?.details ? { details: err.details } : {}),
            };
            adapter?.setError(err);
            adapter?.setStatus(err?.statusCode || err?.status || 500, err?.statusMessage || err?.message);
            adapter?.setPayload(errorBody);
            client.publish(responseTopic, JSON.stringify(errorBody));
        }
    }
});

export function mqttTransportFactory(option: Partial<MqttServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.MQTT,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useMqttMessageTransfer(),
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
    const authProviders: Provider[] = config.features.auth ? [{
        provide: getServiceInterceptorsToken(config),
        useExisting: MessageAuthInterceptor,
        multi: true,
        multiOrder: -300
    } as Provider & { multiOrder: number }] : [];

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        MqttMessageAdapter,
        MqttMessageAdapterFactory,
        { provide: AuthInterceptor, useClass: MessageAuthInterceptor },
        { provide: MessageAuthInterceptor, useExisting: AuthInterceptor },
        ...authProviders,
        {
            provide: backendToken,
            useValue: (_req: any, context: RequestContext): any => {
                const adapter = context.get(StatusMessageAdapter);
                const error = new NotFoundException('Not Found', 404);
                if (adapter) {
                    adapter.setStatus(error.statusCode, error.message)
                        .setError(error)
                        .setPayload({ statusCode: error.statusCode, statusMessage: error.message });
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
