import { createInjector, asProvider, Injector, Provider } from '@tsdi/ioc';
import { createRequestHandler, TransferSide, Transport, PatternFormatter, REQUEST, defaultFormatter, useSimpleJson } from '@tsdi/common';
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
        const client = coap.request({
            host: config.host ?? '127.0.0.1',
            port: config.port ?? 5683,
            pathname,
            method: request.method as any,
            options: request.headers?.getHeaders?.() ?? undefined
        });

        let settled = false;
        let timer: NodeJS.Timeout | undefined;

        const cleanup = () => {
            if (timer) {
                clearTimeout(timer);
                timer = undefined;
            }
        };

        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            cleanup();
            fn();
        };

        client.on('response', (res: any) => {
            const raw = res.payload?.toString() ?? '';
            finish(() => {
                const shouldParseEnvelope = request.observe === 'response';
                const shouldParseJson = shouldParseEnvelope || request.responseType !== 'text';
                let parsed: any = raw;
                if (raw && shouldParseJson) {
                    try {
                        parsed = JSON.parse(raw);
                    } catch {
                        parsed = raw;
                    }
                }
                const parsedStatus = parsed && typeof parsed === 'object'
                    ? (parsed.status ?? parsed.statusCode)
                    : undefined;
                const status = res.code ?? parsedStatus ?? '2.05';
                const responseOptions = parsed && typeof parsed === 'object' && parsed.headers
                    ? parsed.headers.options
                    : (res as any).options;
                const normalizedOptions = Array.isArray(responseOptions)
                    ? responseOptions
                    : responseOptions == null
                        ? []
                        : [responseOptions];
                const response = parsed && typeof parsed === 'object' && 'status' in parsed
                    ? {
                        ...parsed,
                        status,
                        statusCode: parsed.statusCode ?? status,
                        ok: parsed.ok ?? (typeof status === 'string' ? status.startsWith('2.') : true),
                        headers: {
                            ...((res as any).headers ?? {}),
                            ...(parsed.headers ?? {}),
                            options: normalizedOptions
                        }
                    }
                    : {
                        ok: typeof status === 'string' ? status.startsWith('2.') : true,
                        status,
                        statusCode: status,
                        body: parsed,
                        headers: {
                            ...((res as any).headers ?? {}),
                            options: normalizedOptions
                        }
                    };
                if (request.observe === 'response') {
                    observer.next(response);
                    observer.complete();
                    return;
                }
                if (!response.ok) {
                    observer.error(response);
                    return;
                }
                observer.next(response.body ?? response.payload ?? parsed);
                observer.complete();
            });
        });
        client.on('error', (err: Error) => finish(() => observer.error(err)));

        if (request.observe === 'emit') {
            if (payload != null) {
                client.write(payload);
            }
            client.end();
            finish(() => observer.complete());
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

function serializeRequest(request: any, formatter: PatternFormatter, payloadKey: 'body' | 'payload') {
    const json: Record<string, any> = {};
    if (request.url) {
        json.url = typeof request.getUrlWithParams === 'function' ? request.getUrlWithParams() : request.url;
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
        json.params = request.params;
    }
    if (request.query) {
        json.query = request.query;
    }
    if (request.body !== undefined && request.body !== null) {
        json[payloadKey] = request.body;
    }
    return json;
}
