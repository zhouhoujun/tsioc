import { importProvidersFrom } from '@tsdi/ioc';
import { REQUEST, StatusMessageAdapter, Transport, TransferSide } from '@tsdi/common'
import { KafkaServer } from './kafka-server';
import { KafkaPatternFormatter } from './pattern';
import { KafkaServOptions, KAFKA_SERV_OPTIONS } from './options';
import { createServiceTransportFeature, ServiceTransportFeature } from '@tsdi/service';
import { useBrokerMessageTransfer } from '@tsdi/transport';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { KafkaMessageAdapter } from './message-adapter';
import { KafkaMessageAdapterFactory } from './message-adapter.factory';

function toKafkaRouteUrl(rawUrl: unknown): string | undefined {
    if (typeof rawUrl !== 'string' || !rawUrl.length) {
        return undefined;
    }
    return rawUrl.replace(/^\/+/, '').replace(/\//g, '.');
}

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
        const url = toKafkaRouteUrl(requestSource.url)
            ?? (typeof requestSource.topic === 'string' && requestSource.topic.includes('/')
                ? toKafkaRouteUrl(requestSource.topic)
                : undefined)
            ?? topic;
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

    return createServiceTransportFeature({
        config,
        asDefault,
        optionToken: KAFKA_SERV_OPTIONS,
        serverType: KafkaServer,
        providers: [
            importProvidersFrom(ServerCommonModule),
            KafkaPatternFormatter,
            KafkaMessageAdapter,
            KafkaMessageAdapterFactory
        ]
    });
}

export function useKafkaTransport(...options: Partial<KafkaServOptions>[]): ServiceTransportFeature[] {
    return options.map(o => kafkaTransportFactory(o, o.asDefault ?? (options.length === 1)));
}
