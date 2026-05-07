import { asProvider, Injector, Provider, toProvider } from '@tsdi/ioc';
import { createRequestHandler, IncomingMessageReaderFactory, TransferSide, Transport } from '@tsdi/common';
import { createSendMessageBackend, useJsonPacket } from '@tsdi/transport';
import { CLIENT_CONFIGS, ClientFeatureKind, ClientHandler, ClientTransportFeature, getClientBackendToken, getClientHandlerToken, getClientToken, makeClientFeature } from '@tsdi/client';
import { COAP_CLIENT_OPTIONS, CoapClientOptions } from './options';
import { CoapClient } from './client';
import { MessageReaderFactory } from '@tsdi/core';


function coapClientTransportFactory(option: Partial<CoapClientOptions>, asDefault?: boolean): ClientTransportFeature {
    const config = {
        transport: Transport.CoAP,
        side: TransferSide.client,
        ...option,
        features: {
            defaultTransfer: useJsonPacket(),
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
            useFactory: createSendMessageBackend,
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

    if (asDefault) {
        providers.push({
            provide: CoapClient,
            useExisting: clientToken
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
