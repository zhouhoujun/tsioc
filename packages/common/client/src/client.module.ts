import { ArgumentExecption, Arrayify, EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, getToken, isArray, isString, lang, toFactory, toProvider, tokenId } from '@tsdi/ioc';
import { createHandler } from '@tsdi/core';
import { Decoder, Encoder, HybirdTransport, NotImplementedExecption, Transport, TransportSessionFactory } from '@tsdi/common';
import { TopicTransportBackend, TransportBackend } from './backend';
import { ClientOpts, ClientTransportPacketStrategy } from './options';
import { ClientHandler, GLOBAL_CLIENT_INTERCEPTORS } from './handler';
import { Client } from './Client';


export interface ClientModuleConfig {
    /**
     * client options.
     */
    clientOpts?: ProvdierOf<ClientOpts>;
    /**
     * client handler provider
     */
    handler?: ProvdierOf<ClientHandler>;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];
}

export interface ClientModuleOpts extends ClientModuleConfig {
    /**
     * transport
     */
    transport: Transport | HybirdTransport;
    /**
     * client type
     */
    clientType: Type<Client>;
    /**
     * client options token.
     */
    clientOptsToken: Token<ClientOpts>;
    /**
     * client providers
     */
    clientProvider?: ProvdierOf<Client>;
    /**
     * client handler type.
     */
    hanlderType: Type<ClientHandler>;
    /**
     * client default options
     */
    defaultOpts?: ClientOpts;
}


export interface ClientTokenOpts {

    transport: Transport | HybirdTransport;

    /**
     * client token.
     */
    client?: Token<Client>;
}


@Module({
    providers: [
        TransportBackend,
        TopicTransportBackend
    ]
})
export class ClientModule {

    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static register(options: ClientModuleConfig & ClientTokenOpts): ModuleWithProviders<ClientModule>;
    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static register(options: Array<ClientModuleConfig & ClientTokenOpts>): ModuleWithProviders<ClientModule>;
    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static register(options: Arrayify<ClientModuleConfig & ClientTokenOpts>): ModuleWithProviders<ClientModule> {
        let providers: ProviderType[];
        if (isArray(options)) {
            providers = []
            options.forEach(op => {
                providers.push(...clientProviders(op));
            })
        } else {
            providers = clientProviders(options);
        }

        return {
            providers,
            module: ClientModule
        }
    }

}

/**
 * global register client modules.
 */
export const CLIENT_MODULES = tokenId<(ClientModuleOpts)[]>('CLIENT_MODULES');

export const CLIENT_TRANSPORT_PACKET_STRATEGIES: Record<string, ClientTransportPacketStrategy> = {};


function clientProviders(options: ClientModuleConfig & ClientTokenOpts) {
    const { client, transport } = options;

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY
    ];
    const moduleOptsToken: Token<ClientModuleOpts> = getToken<any>(client ?? transport, 'client_module');

    providers.push(toFactory(moduleOptsToken, options, {
        init: (options, injector) => {
            const defts = injector.get(CLIENT_MODULES).find(r => r.transport === transport);
            if (!defts) throw new NotImplementedExecption(options.transport + ' client has not implemented');
            return { ...defts, ...options } as ClientModuleOpts;
        },
        onRegistered: (injector) => {
            const { clientType, clientProvider, hanlderType, clientOptsToken, defaultOpts } = injector.get(moduleOptsToken);

            const providers = [];
            if (clientProvider) {
                providers.push(toProvider(clientType, clientProvider));
            }
            if (options.handler) {
                providers.push(toProvider(hanlderType, options.handler))
            } else {
                providers.push({
                    provide: hanlderType,
                    useFactory: (injector: Injector, opts: ClientOpts) => {
                        return createHandler(injector, opts);
                    },
                    asDefault: true,
                    deps: [Injector, clientOptsToken]
                })
            }
            if (!client) {
                providers.push(toFactory(clientOptsToken, options.clientOpts!, {
                    init: (clientOpts: ClientOpts) => {

                        const opts = { globalInterceptorsToken: GLOBAL_CLIENT_INTERCEPTORS, ...lang.deepClone(defaultOpts), ...clientOpts, providers: [...defaultOpts?.providers || EMPTY, ...clientOpts?.providers || EMPTY] } as ClientOpts & { providers: ProviderType[] };
                        if (opts.sessionFactory) {
                            opts.providers.push(toProvider(TransportSessionFactory, opts.sessionFactory))
                        }

                        if (opts.strategy) {
                            const strategy = isString(opts.strategy) ? CLIENT_TRANSPORT_PACKET_STRATEGIES[opts.strategy] : opts.strategy;
                            if (!strategy) throw new ArgumentExecption('The configured transport packet strategy is empty.')
                            if (strategy.encoder) {
                                opts.providers.push(toProvider(Encoder, strategy.encoder))
                            }

                            if (strategy.decoder) {
                                opts.providers.push(toProvider(Decoder, strategy.decoder))
                            }

                            if (strategy.providers) {
                                opts.providers.push(...strategy.providers);
                            }
                        }

                        if (opts.timeout) {
                            if (opts.transportOpts) {
                                opts.transportOpts.timeout = opts.timeout;
                            } else {
                                opts.transportOpts = { timeout: opts.timeout };
                            }
                        }
                        return opts;
                    }
                }))
            }
            injector.inject(providers);
        }
    }));



    if (client) {
        const token = getToken(client, 'options');
        providers.push(
            toFactory(token, options.clientOpts!, {
                init: (clientOpts: ClientOpts, injector: Injector) => {
                    const { defaultOpts, clientOptsToken } = injector.get(moduleOptsToken);
                    const opts = { ...lang.deepClone(defaultOpts), ...clientOpts, providers: [...defaultOpts?.providers || EMPTY, ...clientOpts?.providers || EMPTY] };

                    if (opts.timeout) {
                        if (opts.transportOpts) {
                            opts.transportOpts.timeout = opts.timeout;
                        } else {
                            opts.transportOpts = { timeout: opts.timeout };
                        }
                    }
                    if (opts.sessionFactory) {
                        opts.providers.push(toProvider(TransportSessionFactory, opts.sessionFactory))
                    }

                    if (opts.strategy) {
                        const strategy = isString(opts.strategy) ? CLIENT_TRANSPORT_PACKET_STRATEGIES[opts.strategy] : opts.strategy;
                        if (!strategy) throw new ArgumentExecption('The configured transport packet strategy is empty.')
                        if (strategy.encoder) {
                            opts.providers.push(toProvider(Encoder, strategy.encoder))
                        }

                        if (strategy.decoder) {
                            opts.providers.push(toProvider(Decoder, strategy.decoder))
                        }

                        if (strategy.providers) {
                            opts.providers.push(...strategy.providers);
                        }
                    }

                    opts.providers.push({ provide: clientOptsToken, useExisting: token });
                    return opts as ClientOpts;
                }
            }),
            {
                provide: client,
                useFactory: (injector: Injector, moduleOpts: ClientModuleOpts) => {
                    return injector.resolve(moduleOpts.clientType, [
                        { provide: moduleOpts.clientOptsToken, useExisting: token }
                    ]);
                },
                deps: [Injector, moduleOptsToken]
            }
        );

    }

    return providers;
}
