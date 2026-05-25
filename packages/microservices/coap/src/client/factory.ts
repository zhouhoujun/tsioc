import { asProvider, Injector, Provider, toProvider } from '@tsdi/ioc';
import { createRequestHandler, IncomingMessageReaderFactory, PatternFormatter, REQUEST, TransferSide, Transport, defaultFormatter, useSimpleJson } from '@tsdi/common';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { COAP_CLIENT_OPTIONS, CoapClientOptions } from './options';
import { CoapClient } from './client';
import { CoapCompatiblePatternFormatter, CoapPatternFormatter } from '../server/pattern';
import { MessageReaderFactory } from '@tsdi/core';
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
                mapping: (value, context) => {
                    if (value && typeof value?.toJson === 'function') {
                        return value.toJson({
                            formatter: context.get(PatternFormatter) ?? defaultFormatter,
                            payloadKey: 'payload'
                        });
                    }
                    return value;
                }
            }),
            ...option.features
        },
    } as CoapClientOptions;
    config.providers ??= [];
    config.features.messagerReaderFactory ??= IncomingMessageReaderFactory;
    config.providers.push(
        { provide: COAP_CLIENT_OPTIONS, useValue: config },
        toProvider(MessageReaderFactory, config.features.messagerReaderFactory),
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
            useFactory: (handler: ClientHandler<any, any>) => {
                return new CoapClient(handler, config);
            },
            deps: [
                hanlderToken
            ]
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

export function withCoapClientTransport(...options: Partial<CoapClientOptions>[]): ClientTransportFeature[] {
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
            : JSON.stringify(request.toJson({ formatter, payloadKey: 'payload' }));
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
            const body = res.payload?.toString() ?? '';
            finish(() => {
                if (request.responseType === 'text') {
                    observer.next(body);
                } else {
                    try {
                        observer.next(JSON.parse(body));
                    } catch {
                        observer.next(body);
                    }
                }
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
