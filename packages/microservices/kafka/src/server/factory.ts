import { Provider, getClassRef, Injector, importProvidersFrom } from '@tsdi/ioc';
import { NotFoundException, RequestContext, REQUEST, StatusMessageAdapter, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { of } from 'rxjs';
import { KafkaServer } from './kafka-server';
import { KafkaPatternFormatter } from './pattern';
import { KafkaServOptions, KAFKA_SERV_OPTIONS } from './options';
import { AuthInterceptor, MessageAuthInterceptor, ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { useBrokerMessageTransfer } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { KafkaMessageAdapter } from './message-adapter';
import { KafkaMessageAdapterFactory } from './message-adapter.factory';

const useKafkaMessageTransfer = () => useBrokerMessageTransfer<any, Record<string, any>>({
    canHandle: (payload) => !!payload && !!payload.message && typeof payload.topic === 'string',
    normalize: (payload) => {
        const { topic, partition, message } = payload;
        const content = message.value?.toString() || '';
        let parsed: any;
        try {
            parsed = JSON.parse(content);
        } catch {
            parsed = content;
        }

        const requestSource: Record<string, any> = parsed && typeof parsed === 'object' ? parsed : {};
        const url = requestSource.url || topic;
        const method = requestSource.method || 'GET';
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        return {
            ...requestSource,
            url,
            method,
            body,
            payload: body,
            topic,
            responseTopic: requestSource.responseTopic ?? `${topic}.response`,
            partition,
            key: message.key?.toString(),
        };
    },
    adapter: {
        factory: KafkaMessageAdapterFactory,
        response: (_input, _requestData, context) => context.getInjector().get(KafkaServer).producer!
    },
    sender: {
        canSend: (_response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return !!requestData?.topic;
        },
        send: (response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            const adapter = context.has(StatusMessageAdapter) ? context.get(StatusMessageAdapter) : null;
            const producer = context.getInjector().get(KafkaServer).producer;
            if (!producer || !requestData?.topic || response === undefined) {
                return;
            }
            producer.send({
                topic: requestData.responseTopic ?? `${requestData.topic}.response`,
                messages: [{
                    value: Buffer.from(JSON.stringify({
                        id: requestData.id,
                        status: adapter?.status ?? 200,
                        statusCode: adapter?.status ?? 200,
                        statusMessage: adapter?.getStatusMessage?.() ?? 'OK',
                        ok: (adapter?.status ?? 200) < 400,
                        headers: adapter?.getResponseHeaderNames?.()?.length ? Object.fromEntries(adapter.getResponseHeaderNames().map(name => [name, adapter.getResponseHeader(name)])) : undefined,
                        body: response,
                        payload: response
                    }))
                }]
            });
        },
        canSendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return !!err && !!requestData?.topic;
        },
        sendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            const adapter = context.has(StatusMessageAdapter) ? context.get(StatusMessageAdapter) : null;
            const producer = context.getInjector().get(KafkaServer).producer;
            if (!producer || !requestData?.topic) {
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
            producer.send({
                topic: requestData.responseTopic ?? `${requestData.topic}.response`,
                messages: [{
                    value: Buffer.from(JSON.stringify({
                        id: requestData.id,
                        status: err?.statusCode || err?.status || 500,
                        statusCode: err?.statusCode || err?.status || 500,
                        statusMessage: err?.statusMessage || err?.message || 'Error',
                        ok: false,
                        error: errorBody,
                        body: errorBody,
                        payload: errorBody,
                        headers: adapter?.getResponseHeaderNames?.()?.length ? Object.fromEntries(adapter.getResponseHeaderNames().map(name => [name, adapter.getResponseHeader(name)])) : undefined
                    }))
                }]
            });
        }
    }
});

export function kafkaTransportFactory(option: Partial<KafkaServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.Kafka, side: TransferSide.server, microservice: true,
        ...option,
        features: {
            defaultTransfer: useKafkaMessageTransfer(),
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
