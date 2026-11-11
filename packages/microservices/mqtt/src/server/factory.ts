import { importProvidersFrom, ArgumentException } from '@tsdi/ioc';
import { BadRequestException, ForbiddenException, NotFoundException, REQUEST, StatusMessageAdapter, Transport, TransferSide, normalize } from '@tsdi/common'
import { MqttServer } from './mqtt-server';
import { MqttServOptions, MQTT_SERV_OPTIONS } from './options';
import { createServiceTransportFeature, ServiceTransportFeature } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { MqttMessageAdapter } from './message-adapter';
import { MqttMessageAdapterFactory } from './message-adapter.factory';
import { useBrokerMessageTransfer } from '@tsdi/transport';

function resolveMessageErrorStatus(err: any): number {
    return err?.statusCode ?? err?.status
        ?? (err instanceof BadRequestException || err instanceof ArgumentException || err?.constructor?.name === 'MissingParameterException'
            ? 400
            : err instanceof ForbiddenException
                ? 403
                : err instanceof NotFoundException
                    ? 404
                    : 500);
}

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
        const url = requestSource.url ? normalize(String(requestSource.url)) : undefined;
        const method = requestSource.method || 'GET';
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        return {
            ...requestSource,
            ...(url ? { url } : {}),
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
            const adapter = context.has(StatusMessageAdapter) ? context.get(StatusMessageAdapter) : null;
            const client = context.getInjector().get(MqttServer).client;
            const responseTopic = requestData?.responseTopic ?? (requestData?.topic ? `${requestData.topic}/response` : undefined);
            if (!client || !responseTopic || response === undefined) {
                return;
            }
            const body = response;
            client.publish(responseTopic, JSON.stringify({
                id: requestData?.id,
                status: adapter?.status ?? 200,
                statusCode: adapter?.status ?? 200,
                statusMessage: adapter?.getStatusMessage?.() ?? 'OK',
                ok: (adapter?.status ?? 200) < 400,
                body,
                payload: body,
                headers: adapter?.getResponseHeaderNames?.()?.length ? Object.fromEntries(adapter.getResponseHeaderNames().map(name => [name, adapter.getResponseHeader(name)])) : undefined
            }));
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
            const status = resolveMessageErrorStatus(err);
            const expose = typeof err?.expose === 'boolean' ? err.expose : (status >= 400 && status < 500);
            const message = status >= 500 && !expose
                ? 'Internal Server Error'
                : err?.message || err?.statusMessage || 'Error';
            const errorBody = {
                error: message,
                statusCode: status,
                ...(err?.details ? { details: err.details } : {}),
            };
            adapter?.setError(err);
            adapter?.setStatus(status, err?.statusMessage || message);
            adapter?.setPayload(errorBody);
            client.publish(responseTopic, JSON.stringify({
                id: requestData?.id,
                status,
                statusCode: status,
                statusMessage: err?.statusMessage || message,
                ok: false,
                error: errorBody,
                body: errorBody,
                payload: errorBody,
                headers: adapter?.getResponseHeaderNames?.()?.length ? Object.fromEntries(adapter.getResponseHeaderNames().map(name => [name, adapter.getResponseHeader(name)])) : undefined
            }));
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

    return createServiceTransportFeature({
        config,
        asDefault,
        optionToken: MQTT_SERV_OPTIONS,
        serverType: MqttServer,
        providers: [
            importProvidersFrom(ServerCommonModule),
            MqttMessageAdapter,
            MqttMessageAdapterFactory
        ]
    });
}

export function useMqttTransport(...options: Partial<MqttServOptions>[]): ServiceTransportFeature[] {
    return options.map(o => mqttTransportFactory(o, o.asDefault ?? (options.length === 1)));
}
