import { createInjector, asProvider, Injector, Provider, isNil } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, REQUEST, ResponseEventPacket } from '@tsdi/common';
import { SOCKET, useBrokerClientTransfer } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature, wrapClientBackendWithTransfer } from '@tsdi/client';
import { REDIS_CLIENT_OPTIONS, RedisClientOptions } from './options';
import { RedisClient } from './client';
import { RedisPatternFormatter } from '../server';
import { RedisRequest } from './request';
import { Observable } from 'rxjs';
import Redis from 'ioredis';


function redisClientTransportFactory(option: Partial<RedisClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.Redis,
        side: TransferSide.client,
        ...option,
        features: {
            defaultTransfer: useBrokerClientTransfer<RedisRequest<any>>({
                mapping: (request) => JSON.stringify(serializeRequest(request, 'payload', request?.id)),
                match: (response, request) => !(response && typeof response === 'object' && response.id != null && response.id !== request?.id),
                normalize: (parsed, request) => {
                    if (parsed && typeof parsed === 'object' && ('status' in parsed || 'statusCode' in parsed || 'ok' in parsed || 'body' in parsed || 'payload' in parsed || 'error' in parsed)) {
                        const status = parsed.status ?? parsed.statusCode ?? (parsed.error ? 500 : 200);
                        const statusMessage = parsed.statusMessage ?? parsed.statusText ?? parsed.error?.message ?? (status >= 400 ? 'Error' : 'OK');
                        const body = !isNil(parsed.body) ? parsed.body : parsed.payload;
                        return {
                            ...parsed,
                            status,
                            statusCode: parsed.statusCode ?? status,
                            statusMessage,
                            statusText: statusMessage,
                            ok: parsed.ok ?? (!parsed.error && status < 400),
                            body,
                            payload: !isNil(body) ? body : parsed.payload,
                            error: parsed.error,
                            headers: parsed.headers ?? {}
                        };
                    }
                    return {
                        status: 200,
                        statusCode: 200,
                        statusMessage: 'OK',
                        statusText: 'OK',
                        ok: true,
                        body: parsed,
                        payload: parsed,
                        headers: {},
                        responseType: request.responseType
                    };
                }
            }),
            ...option.features
        },
        connectOpts: option.connectOpts ? { ...option.connectOpts } : undefined,
    } as RedisClientOptions;
    config.formatter ??= RedisPatternFormatter;
    config.providers ??= [];
    config.providers.push(
        { provide: REDIS_CLIENT_OPTIONS, useValue: config },
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);

    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({
            provide: backendToken,
            useFactory: (injector: Injector) => wrapClientBackendWithTransfer(injector, config, createRedisClientBackend(config)),
            deps: [Injector],
            multi: true
        }),
        {
            provide: hanlderToken,
            useFactory: (injector: Injector) => createRequestHandler(injector, config),
            deps: [
                Injector
            ]
        },
        {
            provide: clientToken,
            useFactory: (injector: Injector) => {
                const handler = injector.get(hanlderToken);
                const childInjector = createInjector(injector, {
                    providers: [
                        { provide: REDIS_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        RedisClient
                    ]
                });
                return childInjector.get(RedisClient);
            },
            deps: [Injector]
        }
    ];

    if (asDefault) {
        providers.push({
            provide: RedisClient,
            useExisting: clientToken
        });
        if (config.formatter) {
            if (config.formatter === RedisPatternFormatter) {
                providers.push(RedisPatternFormatter);
            }
            providers.push({
                provide: PatternFormatter,
                useFactory: (injector: Injector) => injector.get(config.formatter!),
                deps: [Injector]
            });
        }
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;

}

export function withRedisTransport(...options: Partial<RedisClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        const asDefault = option.asDefault ?? (idx === 0);
        return redisClientTransportFactory(option, asDefault);
    });
}

function createRedisClientBackend(config: RedisClientOptions) {
    return (input: any, context: any) => new Observable<any>((observer) => {
        const client = context.get(SOCKET) as Redis | undefined;
        const request = context.get(REQUEST) as RedisRequest<any> | undefined;
        if (!client || !request) {
            observer.error(new Error('Redis client context is incomplete'));
            return;
        }
        const replyRequest = request as RedisRequest<any> & { responseChannel?: string };
        const channel = request.topic;
        const requestId = request.id ?? `${Date.now()}-${Math.random()}`;
        const responseChannel = request.responseTopic
            ?? replyRequest.responseChannel
            ?? `${channel}${config.responseChannelSuffix ?? ':response'}`;
        const payload = typeof input === 'string'
            ? input
            : JSON.stringify(serializeRequest(request, 'payload', requestId, input));

        if (request.observe === 'events') {
            client.publish(channel, payload)
                .then(() => {
                    observer.next({ type: 0 } as ResponseEventPacket);
                    observer.complete();
                })
                .catch(err => observer.error(err));
            return;
        }

        let timer: NodeJS.Timeout | undefined;
        const subscriber = client.duplicate();
        let closed = false;

        const cleanup = () => {
            if (closed) return;
            closed = true;
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
            subscriber.removeAllListeners();
            Promise.resolve((subscriber as any).unsubscribe?.(responseChannel)).catch(() => undefined).finally(() => {
                subscriber.quit().catch(() => {
                    subscriber.disconnect();
                });
            });
        };

        const fail = (err: any) => {
            cleanup();
            observer.error(err);
        };

        subscriber.on('message', (_incomingChannel, message) => {
            try {
                let parsed: any = message.toString();
                try {
                    parsed = JSON.parse(parsed);
                } catch {
                    // keep raw string payload
                }
                if (parsed && typeof parsed === 'object' && parsed.id != null && parsed.id !== requestId) {
                    return;
                }
                if (request.observe === 'observe') {
                    observer.next(parsed);
                    return;
                }
                cleanup();
                observer.next(parsed);
                observer.complete();
            } catch (err) {
                fail(err);
            }
        });
        subscriber.on('error', (err) => fail(err));

        subscriber.subscribe(responseChannel)
            .then(() => client.publish(channel, payload))
            .then(() => {
                if (request.observe === 'observe') {
                    return;
                }
                timer = setTimeout(() => {
                    fail(new Error('Timeout has occurred'));
                }, request.timeout ?? 10000);
            })
            .catch(err => fail(err));

        return cleanup;
    });
}

function serializeRequest(request: any, payloadKey: 'body' | 'payload', requestId?: string | number, payloadValue?: any) {
    const json: Record<string, any> = typeof request?.toJson === 'function'
        ? request.toJson({ payloadKey })
        : {};
    if (requestId != null) {
        json.id = requestId;
    }
    const responseTopic = request.responseTopic ?? request.responseChannel;
    if (responseTopic) {
        json.responseTopic ??= responseTopic;
        json.responseChannel = json.responseTopic;
    }
    const nextPayload = !isNil(payloadValue) ? payloadValue : request[payloadKey];
    if (!isNil(nextPayload)) {
        json[payloadKey] = nextPayload;
    }
    return json;
}

function normalizeTopicFromUrl(url?: string) {
    if (!url) {
        return undefined;
    }
    const [pathname, rawQuery] = String(url).split('?', 2);
    if (rawQuery) {
        return pathname.startsWith('/') ? pathname.slice(1).replace(/\//g, '.') : pathname;
    }
    return pathname.startsWith('/') ? pathname.slice(1).replace(/\//g, '.') : pathname;
}
