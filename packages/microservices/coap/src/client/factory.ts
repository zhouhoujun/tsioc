import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, REQUEST, defaultFormatter, useSimpleJson, parseQueryString, ErrorResponse, ResponseEventPacket } from '@tsdi/common';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { COAP_CLIENT_OPTIONS, CoapClientOptions } from './options';
import { CoapClient } from './client';
import { CoapCompatiblePatternFormatter, CoapPatternFormatter } from '../server/pattern';
import { Observable } from 'rxjs';
import * as coap from 'coap';

function coapClientTransportFactory(option: Partial<CoapClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.CoAP,
        side: TransferSide.client,
        ...option,
        formatter: option.compatibility ? CoapCompatiblePatternFormatter : CoapPatternFormatter,
        features: {
            defaultTransfer: useSimpleJson({
                mapping: (value, context) => mapRequestValue(value, context)
            }),
            ...option.features
        },
    } as CoapClientOptions;
    config.providers ??= [];
    config.providers.push(
        { provide: COAP_CLIENT_OPTIONS, useValue: config },
    );
    const clientToken = getClientToken(config);
    const hanlderToken = getClientHandlerToken(config);
    const backendToken = getClientBackendToken(config);

    const providers: Provider[] = [
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        asProvider({
            provide: backendToken,
            useFactory: () => createCoapClientBackend(config),
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
                        { provide: COAP_CLIENT_OPTIONS, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        CoapClient
                    ]
                });
                return childInjector.get(CoapClient);
            },
            deps: [Injector]
        }
    ];

    providers.push(CoapPatternFormatter, CoapCompatiblePatternFormatter);

    if (asDefault) {
        providers.push({
            provide: CoapClient,
            useExisting: clientToken
        }, {
            provide: PatternFormatter,
            useFactory: (injector: Injector) => injector.get(config.formatter!),
            deps: [Injector]
        })
    }
    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;

}

export function withCoapTransport(...options: Partial<CoapClientOptions>[]): ClientTransportFeature[] {
    return options.map((option, idx) => {
        const asDefault = option.asDefault ?? (idx === 0);
        return coapClientTransportFactory(option, asDefault);
    });
}

function createCoapClientBackend(config: CoapClientOptions) {
    return (input: any, context: any) => new Observable<any>((observer) => {
        const request = context.get(REQUEST) as any;
        if (!request) {
            observer.error(new Error('CoAP client context is incomplete'));
            return;
        }

        const pathname = request.url.startsWith('/') ? request.url : `/${request.url}`;
        const formatter = context.get(PatternFormatter, defaultFormatter);
        const payload = Buffer.isBuffer(input)
            ? input
            : JSON.stringify({
                ...serializeRequest(request, formatter, 'payload'),
                method: request.method,
                observe: request.observe
            });
        const target = config.url ? new URL(config.url) : undefined;
        const client = coap.request({
            host: config.host ?? target?.hostname ?? '127.0.0.1',
            port: config.port ?? (target?.port ? Number(target.port) : 5683),
            pathname,
            method: request.method as any,
            observe: request.observe === 'observe',
            options: undefined
        });

        let settled = false;
        let timer: NodeJS.Timeout | undefined;
        let observeResponse: any;

        const cleanup = () => {
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
            observeResponse?.close?.();
        };

        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            cleanup();
            fn();
        };

        client.on('response', (res: any) => {
            if (request.observe === 'observe') {
                observeResponse = res;
                const onData = (chunk: Buffer | string) => {
                    const parsed = parseCoapReply(typeof chunk === 'string' ? chunk : chunk?.toString?.() ?? '', request, res);
                    if (parsed instanceof ErrorResponse) {
                        finish(() => observer.error(parsed));
                        return;
                    }
                    observer.next(parsed.body ?? parsed.payload ?? parsed);
                };
                const onError = (err: Error) => finish(() => observer.error(err));
                const onEnd = () => finish(() => observer.complete());
                res.on('data', onData);
                res.on('error', onError);
                res.on('end', onEnd);
                return;
            }

            const parsed = parseCoapReply(res.payload?.toString() ?? '', request, res);
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
        });
        client.on('error', (err: Error) => finish(() => observer.error(err)));

        if (request.observe === 'events') {
            if (payload != null) {
                client.write(payload);
            }
            client.end();
            finish(() => {
                observer.next({ type: 0 } as ResponseEventPacket);
                observer.complete();
            });
            return cleanup;
        }

        if (payload != null) {
            client.write(payload);
        }
        client.end();
        timer = setTimeout(() => {
            finish(() => observer.error(new Error('Timeout has occurred')));
        }, request.timeout ?? 10000);

        return cleanup;
    });
}

function mapRequestValue(value: any, context: any) {
    if (value && typeof value === 'object' && ('url' in value || 'topic' in value || 'pattern' in value)) {
        return serializeRequest(value, context.get(PatternFormatter) ?? defaultFormatter, 'payload');
    }
    return value;
}

function normalizeCoapStatus(status: any): string | undefined {
    if (typeof status !== 'number') {
        return status;
    }
    if (status >= 500) return '5.00';
    if (status >= 400) return '4.00';
    if (status >= 300) return '3.00';
    if (status >= 200) return '2.05';
    return undefined;
}

function parseCoapReply(message: string, request: any, res: any) {
    let parsed: any = message;
    try {
        parsed = JSON.parse(message);
    } catch {
        parsed = message;
    }
    const normalized = normalizeCoapResponse(parsed, res);
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

function normalizeCoapResponse(parsed: any, res: any) {
    const parsedStatus = parsed && typeof parsed === 'object'
        ? (parsed.status ?? parsed.statusCode)
        : undefined;
    const status = parsedStatus ?? res.code ?? normalizeCoapStatus(parsedStatus) ?? '2.05';
    const statusMessage = parsed?.statusMessage ?? parsed?.statusText ?? parsed?.error?.message ?? (String(status).startsWith('4') || String(status).startsWith('5') ? 'Error' : 'OK');
    const responseOptions = parsed && typeof parsed === 'object' && parsed.headers
        ? parsed.headers.options
        : (res as any).options;
    const normalizedOptions = Array.isArray(responseOptions)
        ? responseOptions
        : responseOptions == null
            ? []
            : [responseOptions];
    const body = parsed && typeof parsed === 'object' && ('body' in parsed || 'payload' in parsed)
        ? (parsed.body ?? parsed.payload)
        : parsed;
    return {
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
        status,
        statusCode: parsed?.statusCode ?? status,
        statusMessage,
        statusText: statusMessage,
        ok: parsed?.ok ?? (!parsed?.error && !String(status).startsWith('4') && !String(status).startsWith('5')),
        body,
        payload: body,
        error: parsed?.error,
        headers: {
            ...(res?.headers ?? {}),
            ...(parsed?.headers ?? {}),
            options: normalizedOptions
        }
    };
}

function serializeRequest(request: any, formatter: PatternFormatter, payloadKey: 'body' | 'payload') {
    const json: Record<string, any> = {};
    if (request.url) {
        const fullUrl = typeof request.getUrlWithParams === 'function' ? request.getUrlWithParams() : request.url;
        const [url, rawQuery] = String(fullUrl).split('?', 2);
        json.url = url;
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
    if (request.id) {
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
