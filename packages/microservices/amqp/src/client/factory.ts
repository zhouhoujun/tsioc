import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, useSimpleJson, REQUEST, Events, parseQueryString } from '@tsdi/common'
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
            : Buffer.from(JSON.stringify({
                ...serializeRequest(request, formatter, 'payload'),
                method: request.method
            }));
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

        if (request.observe === 'emit') {
            channel.publish(exchange, routingKey, publishPayload, { correlationId });
            finish(() => observer.complete());
            return cleanup;
        }

        channel.assertQueue('', { exclusive: true })
            .then(({ queue }) => channel.consume(queue, (msg) => {
                if (!msg || msg.properties.correlationId !== correlationId) return;
                finish(() => {
                    const text = msg.content.toString();
                    if (request.responseType === 'text') {
                        observer.next(text);
                    } else {
                        try {
                            observer.next(JSON.parse(text));
                        } catch {
                            observer.next(text);
                        }
                    }
                    observer.complete();
                });
            }, { noAck: true }).then(({ consumerTag: tag }) => {
                consumerTag = tag;
                channel.publish(exchange, routingKey, publishPayload, {
                    correlationId,
                    replyTo: queue
                });
                timer = setTimeout(() => {
                    finish(() => observer.error(new Error('Timeout has occurred')));
                }, request.timeout ?? 10000);
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
    const json: Record<string, any> = {};
    if (request.url) {
        const fullUrl = typeof request.getUrlWithParams === 'function' ? request.getUrlWithParams() : request.url;
        const [url, rawQuery] = String(fullUrl).split('?', 2);
        json.url = url.startsWith('/') ? url.slice(1).replace(/\//g, '.') : url;
        if (rawQuery) {
            json.query = parseQueryString(rawQuery);
        }
    }
    if (request.topic) {
        json.topic = request.topic;
    }
    if (request.responseTopic) {
        json.responseTopic = request.responseTopic;
    }
    if (request.id !== undefined && request.id !== null) {
        json.id = request.id;
    }
    if (request.pattern) {
        json.pattern = formatter ? formatter.format(request.pattern) : request.pattern;
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
