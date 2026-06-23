import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, useSimpleJson, REQUEST, parseQueryString, ErrorResponse, ResponseEventPacket } from '@tsdi/common';
import { SOCKET } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { NATS_CLIENT_OPTIONS, NatsClientOptions } from './options';
import { NatsClient } from './client';
import { NatsRequest } from './request';
import { NatsPatternFormatter } from '../server';
import { Observable } from 'rxjs';
import { NatsConnection, StringCodec } from 'nats';


function natsClientTransportFactory(option: Partial<NatsClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.NATS,
        side: TransferSide.client,
        ...option,
        features: {
            defaultTransfer: useSimpleJson({
                mapping: (value, context) => mapRequestValue(value, context)
            }),
            ...option.features
        },
        servers: option.servers ? [...option.servers] : undefined,
    } as NatsClientOptions;
    config.formatter ??= NatsPatternFormatter;
    config.providers ??= [];
    config.providers.push(
        { provide: NATS_CLIENT_OPTIONS, useValue: config },
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);

    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({
            provide: backendToken,
            useFactory: () => createNatsClientBackend(config),
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
                        { provide: NATS_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        NatsClient
                    ]
                });
                return childInjector.get(NatsClient);
            },
            deps: [Injector]
        }
    ];

    if (asDefault) {
        providers.push({
            provide: NatsClient,
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

export function withNatsTransport(...options: Partial<NatsClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        const asDefault = option.asDefault ?? (idx === 0);
        return natsClientTransportFactory(option, asDefault);
    });
}

function createNatsClientBackend(_config: NatsClientOptions) {
    return (input: any, context: any) => new Observable<any>((observer) => {
        const nc = context.get(SOCKET) as NatsConnection | undefined;
        const request = context.get(REQUEST) as NatsRequest<any> | undefined;
        if (!nc || !request) {
            observer.error(new Error('NATS client context is incomplete'));
            return;
        }

        const sc = StringCodec();
        const subject = request.url;
        const requestId = request.id ?? `${Date.now()}-${Math.random()}`;
        const formatter = context.get(PatternFormatter, defaultFormatter);
        const payload = typeof input === 'string' || input instanceof Uint8Array
            ? input
            : JSON.stringify(serializeRequest({ ...request, id: requestId }, formatter, 'payload'));

        if (request.observe === 'emit') {
            nc.publish(subject, typeof payload === 'string' ? sc.encode(payload) : payload);
            observer.next({ type: 0 } as ResponseEventPacket);
            observer.complete();
            return;
        }

        if (request.observe === 'observe') {
            const inbox = request.responseTopic ?? `_INBOX.tsdi.${requestId}`;
            const sub = nc.subscribe(inbox);
            let closed = false;
            (async () => {
                for await (const msg of sub) {
                    if (closed) {
                        break;
                    }
                    const parsed = parseReply(sc.decode(msg.data), request, requestId);
                    if (!parsed) {
                        continue;
                    }
                    if (parsed instanceof ErrorResponse) {
                        observer.error(parsed);
                        break;
                    }
                    observer.next(parsed.body ?? parsed.payload ?? parsed);
                }
            })().catch(err => observer.error(err));
            nc.publish(subject, typeof payload === 'string' ? sc.encode(payload) : payload, { reply: inbox });
            return () => {
                closed = true;
                sub.unsubscribe();
            };
        }

        nc.request(subject, typeof payload === 'string' ? sc.encode(payload) : payload, { timeout: request.timeout ?? 10000 })
            .then(msg => {
                const parsed = parseReply(sc.decode(msg.data), request, requestId);
                if (!parsed) {
                    observer.error(new Error('Response correlation mismatch'));
                    return;
                }
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
            })
            .catch(err => observer.error(err));
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

function parseReply(message: string, request: NatsRequest<any>, requestId: string | number) {
    let parsed: any = message;
    try {
        parsed = JSON.parse(message);
    } catch {
        parsed = message;
    }
    if (parsed && typeof parsed === 'object' && parsed.id != null && parsed.id !== requestId) {
        return null;
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
