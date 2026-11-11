import { importProvidersFrom } from '@tsdi/ioc';
import { REQUEST, StatusMessageAdapter, Transport, TransferSide } from '@tsdi/common'
import { NatsServer } from './nats-server';
import { NatsPatternFormatter } from './pattern';
import { NatsServOptions, NATS_SERV_OPTIONS } from './options';
import { createServiceTransportFeature, ServiceTransportFeature } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { NatsMessageAdapter } from './message-adapter';
import { NatsMessageAdapterFactory } from './message-adapter.factory';
import { useBrokerMessageTransfer } from '@tsdi/transport';

const useNatsMessageTransfer = () => useBrokerMessageTransfer<any, Record<string, any>>({
    canHandle: (input) => !!input && typeof input.subject === 'string' && !!input.data,
    normalize: ({ subject, data, sc, msg }) => {
        const content = sc.decode(data);
        let parsed: any;
        try {
            parsed = JSON.parse(content);
        } catch {
            parsed = content;
        }

        const requestSource: Record<string, any> = parsed && typeof parsed === 'object' ? parsed : {};
        const actualSubject = msg?.subject ?? subject;
        const topic = requestSource.topic ?? actualSubject;
        const rawUrl = requestSource.url
            ?? (typeof requestSource.topic === 'string' && requestSource.topic.includes('/')
                ? requestSource.topic
                : undefined);
        const url = typeof rawUrl === 'string'
            ? rawUrl.replace(/^\/+/, '').replace(/\//g, '.')
            : undefined;
        const pattern = requestSource.pattern ?? topic;
        const method = requestSource.method || 'GET';
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        const requestData: Record<string, any> = {
            ...requestSource,
            url,
            topic,
            method,
            body,
            payload: body,
            subject: actualSubject,
            _respond: (data: any) => {
                if (msg.respond) {
                    const buf = sc.encode(JSON.stringify(data));
                    msg.respond(buf);
                }
            },
        };
        if (pattern !== undefined) {
            requestData.pattern = pattern;
        }
        return requestData;
    },
    adapter: {
        factory: NatsMessageAdapterFactory,
        response: (_input, _requestData, context) => context.getInjector().get(NatsServer).nc!
    },
    sender: {
        canSend: (_response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return typeof requestData?._respond === 'function';
        },
        send: (response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            requestData?._respond?.({ payload: response });
        },
        canSendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return !!err && typeof requestData?._respond === 'function';
        },
        sendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            const adapter = context.has(StatusMessageAdapter) ? context.get(StatusMessageAdapter) : null;
            const errorBody = {
                error: err?.message || err?.statusMessage || 'Error',
                statusCode: err?.statusCode || err?.status || 500,
                ...(err?.details ? { details: err.details } : {}),
            };
            adapter?.setError(err);
            adapter?.setStatus(err?.statusCode || err?.status || 500, err?.statusMessage || err?.message);
            adapter?.setPayload(errorBody);
            requestData?._respond?.(errorBody);
        }
    }
});

export function natsTransportFactory(option: Partial<NatsServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.NATS,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useNatsMessageTransfer(),
            ...option.features,
            router: option.features?.router === false ? false : {
                ...(typeof option.features?.router === 'object' ? option.features.router : {}),
                formatter: (typeof option.features?.router === 'object' && option.features.router.formatter) || NatsPatternFormatter
            }
        },
        servers: option.servers ? [...option.servers] : undefined,
        subjects: option.subjects ? [...option.subjects] : undefined,
    } as NatsServOptions;

    return createServiceTransportFeature({
        config,
        asDefault,
        optionToken: NATS_SERV_OPTIONS,
        serverType: NatsServer,
        providers: [
            importProvidersFrom(ServerCommonModule),
            NatsPatternFormatter,
            NatsMessageAdapter,
            NatsMessageAdapterFactory
        ]
    });
}

export function useNatsTransport(...options: Partial<NatsServOptions>[]): ServiceTransportFeature[] {
    return options.map(o => natsTransportFactory(o, o.asDefault ?? (options.length === 1)));
}
