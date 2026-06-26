import { Provider, getClassRef, Injector, importProvidersFrom } from '@tsdi/ioc';
import { NotFoundException, RequestContext, REQUEST, StatusMessageAdapter, createRequestHandler, Transport, TransferSide } from '@tsdi/common'
import { of } from 'rxjs';
import { AmqpServer } from './amqp-server';
import { AmqpPatternFormatter } from './pattern';
import { AmqpServOptions, AMQP_SERV_OPTIONS } from './options';
import { AuthInterceptor, MessageAuthInterceptor, ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { AmqpMessageAdapter } from './message-adapter';
import { AmqpMessageAdapterFactory } from './message-adapter.factory';
import { useBrokerMessageTransfer } from '@tsdi/transport';

const useAmqpMessage = () => useBrokerMessageTransfer<any, Record<string, any>>({
    canHandle: (msg) => !!msg && !!msg.fields && !!msg.properties && !!msg.content,
    normalize: (msg) => {
        const content = msg.content.toString();
        let parsed: any;
        try {
            parsed = JSON.parse(content);
        } catch {
            parsed = content;
        }

        const routingKey = msg.fields.routingKey;
        const requestSource: Record<string, any> = parsed && typeof parsed === 'object' ? parsed : {};
        const topic = requestSource.topic ?? routingKey;
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
            replyTo: msg.properties.replyTo,
            correlationId: msg.properties.correlationId,
            msg,
        };
        if (pattern !== undefined) {
            requestData.pattern = pattern;
        }
        return requestData;
    },
    adapter: {
        factory: AmqpMessageAdapterFactory,
        response: (_input, _requestData, context) => context.getInjector().get(AmqpServer).channel!
    },
    sender: {
        canSend: (_response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return !!requestData?.replyTo;
        },
        send: (response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            const channel = context.getInjector().get(AmqpServer).channel;
            if (!channel || !requestData?.replyTo) {
                return;
            }
            const buf = Buffer.from(JSON.stringify({ payload: response }));
            channel.sendToQueue(requestData.replyTo, buf, { correlationId: requestData.correlationId });
        },
        canSendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return !!err && !!requestData?.replyTo;
        },
        sendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            const adapter = context.has(StatusMessageAdapter) ? context.get(StatusMessageAdapter) : null;
            const channel = context.getInjector().get(AmqpServer).channel;
            if (!channel || !requestData?.replyTo) {
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
            const buf = Buffer.from(JSON.stringify({ payload: errorBody }));
            channel.sendToQueue(requestData.replyTo, buf, { correlationId: requestData.correlationId });
        },
        afterSuccess: (_response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            if (requestData?.msg) {
                context.getInjector().get(AmqpServer).channel?.ack(requestData.msg);
            }
        },
        afterError: (_error, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            if (requestData?.msg) {
                context.getInjector().get(AmqpServer).channel?.nack(requestData.msg, false, false);
            }
        }
    }
});

export function amqpTransportFactory(option: Partial<AmqpServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.AMQP,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useAmqpMessage(),
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
    const authProviders: Provider[] = config.features.auth ? [{
        provide: getServiceInterceptorsToken(config),
        useExisting: MessageAuthInterceptor,
        multi: true,
        multiOrder: -300
    } as Provider & { multiOrder: number }] : [];

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        AmqpPatternFormatter,
        AmqpMessageAdapter,
        AmqpMessageAdapterFactory,
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
