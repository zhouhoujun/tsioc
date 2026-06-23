import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, REQUEST, useSimpleJson, parseQueryString, ErrorResponse, ResponseEventPacket } from '@tsdi/common';
import { SOCKET } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
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
            defaultTransfer: useSimpleJson({
                mapping: (value, context) => mapRequestValue(value, context)
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
            useFactory: () => createRedisClientBackend(config),
            multi: true
        }),
        {
            provide: hanlderToken,
            useFactory: (injector: Injector) => {
                return createRequestHandler(injector, config)
            },
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

        const channel = request.url;
        const requestId = request.id ?? `${Date.now()}-${Math.random()}`;
        const responseChannel = replyRequest.responseChannel
            ?? `${channel}${config.responseChannelSuffix ?? ':response'}`;
        const formatter = context.get(PatternFormatter, defaultFormatter);
        const payload = typeof input === 'string'
            ? JSON.stringify({ id: requestId, payload: input })
            : JSON.stringify(serializeRequest({ ...request, id: requestId }, formatter, 'payload'));

        if (request.observe === 'emit') {
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
            subscriber.quit().catch(() => {
                subscriber.disconnect();
            });
        };

        const fail = (err: any) => {
            cleanup();
            observer.error(err);
        };

        subscriber.on('message', (_incomingChannel, message) => {
            try {
                const parsed = parseReply(message, request, requestId);
                if (!parsed) {
                    return;
                }
                if (request.observe === 'observe') {
                    if (parsed instanceof ErrorResponse) {
                        fail(parsed);
                        return;
                    }
                    observer.next(parsed.body ?? parsed.payload ?? parsed);
                    return;
                }
                cleanup();
                if (request.observe === 'response') {
                    observer.next(parsed);
                    observer.complete();
                    return;
                }
                if (parsed instanceof ErrorResponse) {
                    observer.error(parsed);
                    return;
                }
                observer.next(parsed.body ?? parsed.payload ?? parsed);
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

function mapRequestValue(value: any, context: any) {
    if (value && typeof value === 'object' && ('url' in value || 'topic' in value || 'pattern' in value)) {
        return serializeRequest(value, context.get(PatternFormatter) ?? defaultFormatter, 'payload');
    }
    return value;
}

function serializeRequest(request: any, formatter: PatternFormatter, payloadKey: 'body' | 'payload') {
    const json: Record<string, any> = {};
    if (request.url) {
        const fullUrl = typeof request.getUrlWithParams === 'function' ? request.getUrlWithParams() : request.url;
        const [url, rawQuery] = String(fullUrl).split('?', 2);
        json.url = url.startsWith('/') ? url.slice(1).replace(/\//g, '.') : url;
        if (rawQuery) {
            json.query = parseQueryString(rawQuery);
        }
    }
    if (request.responseChannel) {
        json.responseChannel = request.responseChannel;
    }
    if (request.id !== undefined && request.id !== null) {
        json.id = request.id;
    }
    if (request.pattern) {
        json.pattern = formatter ? formatter.format(request.pattern) : request.pattern;
    }
    if (request.method) {
        json.method = request.method;
    }
    if (request.headers?.size) {
        json.headers = request.headers.getHeaders();
    }
    if (request.params) {
        json.params = typeof request.params?.toRecord === 'function' ? request.params.toRecord() : request.params;
    }
    if (request.query && !json.query) {
        json.query = request.query;
    }
    if (request.body !== undefined && request.body !== null) {
        json[payloadKey] = request.body;
    }
    return json;
}

function parseReply(message: string, request: RedisRequest<any>, requestId: string | number) {
    const raw = message.toString();
    let parsed: any = raw;
    try {
        parsed = JSON.parse(raw);
    } catch {
        parsed = raw;
    }
    if (parsed && typeof parsed === 'object' && parsed.id != null && parsed.id !== requestId) {
        return null;
    }
    if (request.observe === 'response') {
        return normalizeResponse(parsed, request);
    }
    const normalized = normalizeResponse(parsed, request);
    if (!normalized.ok) {
        return new ErrorResponse({
            status: normalized.status,
            statusMessage: normalized.statusMessage,
            statusText: normalized.statusText,
            headers: normalized.headers,
            error: normalized.error ?? normalized.body ?? normalized.payload
        });
    }
    return normalized;
}

function normalizeResponse(parsed: any, request: RedisRequest<any>) {
    if (parsed && typeof parsed === 'object' && ('status' in parsed || 'statusCode' in parsed || 'ok' in parsed || 'body' in parsed || 'payload' in parsed || 'error' in parsed)) {
        const status = parsed.status ?? parsed.statusCode ?? (parsed.error ? 500 : 200);
        const statusMessage = parsed.statusMessage ?? parsed.statusText ?? parsed.error?.message ?? (status >= 400 ? 'Error' : 'OK');
        const body = parsed.body ?? parsed.payload;
        return {
            ...parsed,
            status,
            statusCode: parsed.statusCode ?? status,
            statusMessage,
            statusText: statusMessage,
            ok: parsed.ok ?? (!parsed.error && status < 400),
            body,
            payload: body ?? parsed.payload,
            error: parsed.error,
            headers: parsed.headers ?? {}
        };
    }
    const body = parsed;
    return {
        status: 200,
        statusCode: 200,
        statusMessage: 'OK',
        statusText: 'OK',
        ok: true,
        body,
        payload: body,
        headers: {},
        responseType: request.responseType
    };
}
