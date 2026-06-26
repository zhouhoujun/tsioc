import { createInjector, asProvider, Injector, Provider, isNil } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, REQUEST, ResponseEventPacket } from '@tsdi/common'
import { SOCKET, useBrokerClientTransfer } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature, wrapClientBackendWithTransfer } from '@tsdi/client';
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
            defaultTransfer: useBrokerClientTransfer<any>({
                mapping: (request) => JSON.stringify(serializeRequest(request, 'payload', request?.id)),
                normalize: (parsed) => {
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
                        headers: {}
                    };
                }
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
            useFactory: (injector: Injector) => wrapClientBackendWithTransfer(injector, config, createAmqpClientBackend(config)),
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
        const publishPayload = Buffer.isBuffer(input)
            ? input
            : typeof input === 'string'
                ? Buffer.from(input)
                : Buffer.from(JSON.stringify(serializeRequest(request, 'payload', correlationId, input)));
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
                let parsed: any = msg.content.toString();
                try {
                    parsed = JSON.parse(parsed);
                } catch {
                    // keep raw string payload
                }
                if (request.observe === 'observe') {
                    observer.next(parsed);
                    return;
                }
                finish(() => {
                    observer.next(parsed);
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

function serializeRequest(request: any, payloadKey: 'body' | 'payload', requestId?: string | number, payloadValue?: any) {
    const json: Record<string, any> = typeof request?.toJson === 'function'
        ? request.toJson({ payloadKey })
        : {};
    if (requestId != null) {
        json.id = requestId;
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
    const [pathname] = String(url).split('?', 2);
    return pathname.startsWith('/') ? pathname.slice(1).replace(/\//g, '.') : pathname;
}
