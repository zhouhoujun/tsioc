import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, useSimpleJson, REQUEST, Events, parseQueryString, ErrorResponse, ResponseEventPacket } from '@tsdi/common'
import { SOCKET } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { AMQP_CLIENT_OPTIONS, AmqpClientOptions } from './options';
import { AmqpClient } from './client';
import { AmqpPatternFormatter } from '../server';
import { Observable } from 'rxjs';
import * as amqp from 'amqplib';

function amqpClientTransportFactory(option: Partial<AmqpClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.AMQP,
        side: TransferSide.client,
        ...option,
        features: {
            defaultTransfer: useSimpleJson({
                mapping: (value, context) => mapRequestValue(value, context)
            }),
            ...option.features
        },
    } as AmqpClientOptions;
    config.formatter ??= AmqpPatternFormatter;
    config.providers ??= [];
    config.providers.push(
        { provide: AMQP_CLIENT_OPTIONS, useValue: config },
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);

    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({
            provide: backendToken,
            useFactory: () => createAmqpClientBackend(config),
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
                        { provide: AMQP_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        AmqpClient
                    ]
                });
                return childInjector.get(AmqpClient);
            },
            deps: [Injector]
        }
    ];

    if (asDefault) {
        providers.push({
            provide: AmqpClient,
            useExisting: clientToken
        });
        if (config.formatter) {
            providers.push({
                provide: PatternFormatter,
                useFactory: (injector: Injector) => injector.get(config.formatter!),
                deps: [Injector]
            });
        }
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;

}

export function withAmqpTransport(...options: Partial<AmqpClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        const asDefault = option.asDefault ?? (idx === 0);
        return amqpClientTransportFactory(option, asDefault);
    });
}

function createAmqpClientBackend(config: AmqpClientOptions) {
    return (input: any, context: any) => new Observable<any>((observer) => {
        const channel = context.get(SOCKET) as amqp.Channel | undefined;
        const request = context.get(REQUEST) as any;
        if (!channel || !request) {
            observer.error(new Error('AMQP client context is incomplete'));
            return;
        }

        const exchange = config.exchange ?? 'tsdi';
        const routingKey = config.routingKey ?? '*.microservice';
        const correlationId = String(request.id ?? `${Date.now()}-${Math.random()}`);
        const formatter = context.get(PatternFormatter, defaultFormatter);
        const publishPayload = Buffer.isBuffer(input)
            ? input
            : Buffer.from(JSON.stringify(serializeRequest(request, formatter, 'payload')));
        let consumerTag: string | undefined;
        let settled = false;
        let timer: NodeJS.Timeout | undefined;

        const cleanup = () => {
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
            if (consumerTag) {
                channel.cancel(consumerTag).catch(() => undefined);
                consumerTag = undefined;
            }
        };

        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            cleanup();
            fn();
        };

        if (request.observe === 'events') {
            channel.publish(exchange, routingKey, publishPayload, { correlationId });
            finish(() => {
                observer.next({ type: 0 } as ResponseEventPacket);
                observer.complete();
            });
            return cleanup;
        }

        channel.assertQueue('', { exclusive: true })
            .then(({ queue }) => channel.consume(queue, (msg) => {
                if (!msg || msg.properties.correlationId !== correlationId) return;
                const parsed = parseReply(msg.content.toString(), request);
                if (request.observe === 'observe') {
                    if (parsed instanceof ErrorResponse) {
                        finish(() => observer.error(parsed));
                        return;
                    }
                    observer.next(parsed.body ?? parsed.payload ?? parsed);
                    return;
                }
                finish(() => {
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
                });
            }, { noAck: true }).then(({ consumerTag: tag }) => {
                consumerTag = tag;
                channel.publish(exchange, routingKey, publishPayload, {
                    correlationId,
                    replyTo: queue
                });
                if (request.observe !== 'observe') {
                    timer = setTimeout(() => {
                        finish(() => observer.error(new Error('Timeout has occurred')));
                    }, request.timeout ?? 10000);
                }
            }))
            .catch(err => finish(() => observer.error(err)));

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
    const json: Record<string, any> = typeof request?.toJson === 'function'
        ? request.toJson({ formatter, payloadKey })
        : {};
    json.topic ??= request.topic ?? normalizeTopicFromUrl(request.url);
    if (request.url) {
        json.url ??= request.url;
    }
    if (request.params && !json.params) {
        json.params = typeof request.params?.toRecord === 'function' ? request.params.toRecord() : request.params;
    }
    if (request.url && request.query && !json.query) {
        json.query = request.query;
    }
    return json;
}

function normalizeTopicFromUrl(url?: string) {
    if (!url) {
        return undefined;
    }
    const [pathname] = String(url).split('?', 2);
    return pathname.startsWith('/') ? pathname.slice(1).replace(/\//g, '.') : pathname;
}

function parseReply(message: string, request: any) {
    let parsed: any = message;
    try {
        parsed = JSON.parse(message);
    } catch {
        parsed = message;
    }
    const normalized = normalizeResponse(parsed);
    if (request.observe === 'response') {
        return normalized;
    }
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

function normalizeResponse(parsed: any) {
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
    return {
        status: 200,
        statusCode: 200,
        statusMessage: 'OK',
        statusText: 'OK',
        ok: true,
        body: parsed,
        payload: parsed,
        headers: {}
    };
}
