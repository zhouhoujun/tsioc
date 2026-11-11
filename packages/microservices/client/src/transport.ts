import { AbstractType, Injector, Provider, Token, createInjector } from '@tsdi/ioc';
import { createRequestHandler } from '@tsdi/common';
import { AbstractClient } from './AbstractClient';
import { ClientHandler } from './ClientHandler';
import { ensureClientConnectedInterceptor } from './interceptors/connect';
import { ClientConfig, ClientFeatureKind, ClientTransportFeature } from './options';
import { makeClientFeature, CLIENT_CONFIGS } from './provider';
import {
    getClientHandlerToken,
    getClientInterceptorsToken,
    getClientToken
} from './tokens';

export interface CreateClientTransportFeatureOptions<TConfig extends ClientConfig = ClientConfig> {
    /**
     * normalized client config.
     */
    config: TConfig;
    /**
     * transport option token (e.g. `WS_CLIENT_OPTIONS`).
     */
    optionToken: Token<TConfig>;
    /**
     * protocol client type (e.g. `WsClient`).
     */
    clientType: AbstractType<AbstractClient<any, any>>;
    /**
     * create the transport backend provider.
     */
    backendProvider: Provider;
    /**
     * mark this client as the default one.
     */
    asDefault?: boolean;
    /**
     * additional top-level providers.
     */
    providers?: Provider[];
    /**
     * additional child-injector providers (formatter, options, ...).
     */
    childProviders?: Provider[];
    /**
     * providers added when this client is the default.
     */
    defaultProviders?: Provider[];
}

/**
 * Build the common client side transport feature used by every microservice
 * protocol: config registration, backend, handler, client instance and the
 * connection interceptor.
 *
 * Protocol packages only provide their config, client type and backend.
 */
export function createClientTransportFeature<TConfig extends ClientConfig>(
    options: CreateClientTransportFeatureOptions<TConfig>
): ClientTransportFeature {
    const { config, optionToken, clientType, asDefault } = options;
    config.providers ??= [];
    config.providers.push({ provide: optionToken, useValue: config });

    const clientToken = getClientToken(config);
    const handlerToken = getClientHandlerToken(config);
    const interceptorsToken = getClientInterceptorsToken(config);

    const providers: Provider[] = [
        ...(options.providers ?? []),
        { provide: CLIENT_CONFIGS, useValue: config, multi: true },
        options.backendProvider,
        {
            provide: handlerToken,
            useFactory: (injector: Injector) => createRequestHandler(injector, config),
            deps: [Injector]
        },
        {
            provide: clientToken,
            useFactory: (injector: Injector) => {
                const handler = injector.get(handlerToken);
                const childInjector = createInjector(injector, {
                    providers: [
                        { provide: optionToken, useValue: config },
                        { provide: ClientHandler, useValue: handler },
                        ...(options.childProviders ?? []),
                        clientType as any
                    ]
                });
                return childInjector.get(clientType);
            },
            deps: [Injector]
        },
        { provide: interceptorsToken, useValue: ensureClientConnectedInterceptor(config), multi: true, multiOrder: 0 }
    ];

    if (asDefault) {
        providers.push(
            { provide: clientType, useExisting: clientToken } as any,
            ...(options.defaultProviders ?? [])
        );
    }

    return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
}
