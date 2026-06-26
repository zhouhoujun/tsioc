import { createInjector, asProvider, Injector, Provider, isNil } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, defaultFormatter, REQUEST, ResponseEventPacket } from '@tsdi/common';
import { SOCKET, useBrokerClientTransfer } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature, wrapClientBackendWithTransfer } from '@tsdi/client';
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
            defaultTransfer: useBrokerClientTransfer<NatsRequest<any>>({
                mapping: (request) => JSON.stringify(serializeRequest(request, 'payload', request?.id)),
                match: (response, request) => !(response && typeof response === 'object' && response.id != null && response.id !== request?.id),
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
            useFactory: (injector: Injector) => wrapClientBackendWithTransfer(injector, config, createNatsClientBackend(config)),
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
        const replyRequest = request as NatsRequest<any> & { responseTopic?: string };
        const subject = request.topic;
        const requestId = request.id ?? `${Date.now()}-${Math.random()}`;
        const payload = typeof input === 'string' || input instanceof Uint8Array
            ? input
            : JSON.stringify(serializeRequest(request, 'payload', requestId, input));

        if (request.observe === 'events') {
            nc.publish(subject, typeof payload === 'string' ? sc.encode(payload) : payload);
            observer.next({ type: 0 } as ResponseEventPacket);
            observer.complete();
            return;
        }

        if (request.observe === 'observe') {
            const inbox = replyRequest.responseTopic ?? `_INBOX.tsdi.${requestId}`;
            const sub = nc.subscribe(inbox);
            let closed = false;
            (async () => {
                for await (const msg of sub) {
                    if (closed) {
                        break;
                    }
                    let parsed: any = sc.decode(msg.data);
                    try {
                        parsed = JSON.parse(parsed);
                    } catch {
                        // keep raw string payload
                    }
                    if (parsed && typeof parsed === 'object' && parsed.id != null && parsed.id !== requestId) {
                        continue;
                    }
                    observer.next(parsed);
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
                let parsed: any = sc.decode(msg.data);
                try {
                    parsed = JSON.parse(parsed);
                } catch {
                    // keep raw string payload
                }
                if (parsed && typeof parsed === 'object' && parsed.id != null && parsed.id !== requestId) {
                    observer.error(new Error('Response correlation mismatch'));
                    return;
                }
                observer.next(parsed);
                observer.complete();
            })
            .catch(err => observer.error(err));
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
