import { Provider, getClassRef, Injector, importProvidersFrom, ArgumentException } from '@tsdi/ioc';
import { BadRequestException, ForbiddenException, NotFoundException, RequestContext, REQUEST, StatusMessageAdapter, createRequestHandler, Transport, TransferSide, normalize } from '@tsdi/common'
import { of } from 'rxjs';
import { RedisServer } from './redis-server';
import { RedisPatternFormatter } from './pattern';
import { RedisServOptions, REDIS_SERV_OPTIONS } from './options';
import { AuthInterceptor, MessageAuthInterceptor, ServiceTransportFeature, ServiceFeatureKind, getServiceToken, getServiceBackendToken, getServiceInterceptorsToken, getServiceFiltersToken, getServiceGuardsToken, ServiceHandler, REGISTER_MICRO_SERVICES } from '@tsdi/service';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import { RedisMessageAdapter } from './message-adapter';
import { RedisMessageAdapterFactory } from './message-adapter.factory';
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

const useRedisMessageTransfer = () => useBrokerMessageTransfer<{ channel: string; message: string }, Record<string, any>>({
    canHandle: (input) => !!input && typeof input.channel === 'string' && typeof input.message === 'string',
    normalize: ({ channel, message }) => {
        let parsed: any;
        try {
            parsed = JSON.parse(message);
        } catch {
            parsed = message;
        }
        const requestSource: Record<string, any> = parsed && typeof parsed === 'object' ? parsed : {};
        const url = requestSource.url ? normalize(String(requestSource.url)) : undefined;
        const method = requestSource.method || 'GET';
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        const requestData: Record<string, any> = {
            ...requestSource,
            ...(url ? { url } : {}),
            method,
            body,
            payload: body,
            channel,
            topic: requestSource.topic ?? channel
        };
        requestData.responseChannel ??= requestData.responseTopic ?? `${channel}:response`;
        return requestData;
    },
    adapter: {
        factory: RedisMessageAdapterFactory,
        response: (_input, _requestData, context) => context.getInjector().get(RedisServer).publisher!
    },
    sender: {
        canSend: (_response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return !!requestData?.responseChannel;
        },
        send: (response, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            const adapter = context.has(StatusMessageAdapter) ? context.get(StatusMessageAdapter) : null;
            const publisher = context.getInjector().get(RedisServer).publisher;
            if (!publisher || !requestData?.channel) {
                return;
            }
            const body = response;
            if (body === undefined) {
                return;
            }
            const message = {
                id: requestData.id,
                status: adapter?.status ?? 200,
                statusCode: adapter?.status ?? 200,
                statusMessage: adapter?.getStatusMessage?.() ?? 'OK',
                ok: (adapter?.status ?? 200) < 400,
                headers: adapter?.getResponseHeaderNames?.()?.length ? Object.fromEntries(adapter.getResponseHeaderNames().map(name => [name, adapter.getResponseHeader(name)])) : undefined,
                body,
                payload: body
            };
            publisher.publish(requestData.responseChannel ?? `${requestData.channel}:response`, JSON.stringify(message));
        },
        canSendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            return !!requestData?.responseChannel && !!err;
        },
        sendError: (err: any, context) => {
            const requestData = context.get(REQUEST) as Record<string, any>;
            const adapter = context.has(StatusMessageAdapter) ? context.get(StatusMessageAdapter) : null;
            const publisher = context.getInjector().get(RedisServer).publisher;
            if (!publisher || !requestData?.channel) {
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
            publisher.publish(requestData.responseChannel ?? `${requestData.channel}:response`, JSON.stringify({
                id: requestData.id,
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

export function redisTransportFactory(option: Partial<RedisServOptions>, asDefault?: boolean): ServiceTransportFeature {
    const config = {
        transport: Transport.Redis,
        side: TransferSide.server,
        microservice: true,
        ...option,
        features: {
            defaultTransfer: useRedisMessageTransfer(),
            ...option.features,
            router: option.features?.router === false ? false : {
                ...(typeof option.features?.router === 'object' ? option.features.router : {}),
                formatter: (typeof option.features?.router === 'object' && option.features.router.formatter) || RedisPatternFormatter
            }
        },
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
        channels: option.channels ? [...option.channels] : undefined,
    } as RedisServOptions;

    const serviceToken = getServiceToken(config);
    const backendToken = getServiceBackendToken(config);
    getServiceInterceptorsToken(config);
    getServiceFiltersToken(config);
    getServiceGuardsToken(config);

    config.providers ??= [];
    config.providers.push(
        { provide: REDIS_SERV_OPTIONS, useValue: config },
    );
    const authProviders: Provider[] = config.features.auth ? [{
        provide: getServiceInterceptorsToken(config),
        useExisting: MessageAuthInterceptor,
        multi: true,
        multiOrder: -300
    } as Provider & { multiOrder: number }] : [];

    const providers: Provider[] = [
        importProvidersFrom(ServerCommonModule),
        RedisPatternFormatter,
        RedisMessageAdapter,
        RedisMessageAdapterFactory,
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
                return getClassRef(RedisServer).createInvocation(injector, {
                    providers: [
                        { provide: REDIS_SERV_OPTIONS, useValue: config },
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

export function useRedisTransport(...options: Partial<RedisServOptions>[]): ServiceTransportFeature[] {
    return options.map(o => redisTransportFactory(o, o.asDefault ?? (options.length === 1)));
}
