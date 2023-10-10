import { Arrayify, EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, getToken, isArray, toFactory, toProvider, tokenId } from '@tsdi/ioc';
import { createHandler } from '@tsdi/core';
import { NotImplementedExecption, Transport, TransportRequired, TransportSessionFactory } from '@tsdi/common';
import { TopicTransportBackend, TransportBackend } from './backend';
import { ClientOpts } from './options';
import { ClientHandler } from './handler';
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

export interface ClientModuleOpts extends ClientModuleConfig, TransportRequired {
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
    static forClient(options: ClientModuleConfig & TransportRequired & ClientTokenOpts): ModuleWithProviders<ClientModule>;
    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static forClient(options: Array<ClientModuleConfig & TransportRequired & ClientTokenOpts>): ModuleWithProviders<ClientModule>;
    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static forClient(options: Arrayify<ClientModuleConfig & TransportRequired & ClientTokenOpts>): ModuleWithProviders<ClientModule> {
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

export const CLIENT_MODULES = tokenId<(ClientModuleOpts & TransportRequired)[]>('CLIENT_MODULES')


function clientProviders(options: ClientModuleConfig & TransportRequired & ClientTokenOpts) {
    const { client, transport } = options;

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY
    ];
    const moduleOptsToken: Token<ClientModuleOpts> = getToken<any>(client ?? transport, 'client_module');

    providers.push(toFactory(moduleOptsToken, options, {
        init: (options, injector) => {
            const defts = injector.get(CLIENT_MODULES).find(r => r.transport === transport);
            if (!defts) throw new NotImplementedExecption(options.transport + ' client has not implemented');
            return { ...defts, ...options } as ClientModuleOpts & TransportRequired;
        },
        onRegistered: (injector) => {
            const { clientType, clientProvider, hanlderType, clientOptsToken, defaultOpts } = injector.get(moduleOptsToken);

            const providers = [];
            if (clientProvider) {
                providers.push(toProvider(clientType, clientProvider));
            } else if (clientType) {
                providers.push(clientType);
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
                        const opts = { ...defaultOpts, ...clientOpts, providers: [...defaultOpts?.providers || EMPTY, ...clientOpts?.providers || EMPTY] };
                        if (opts.sessionFactory) {
                            opts.providers.push(toProvider(TransportSessionFactory, opts.sessionFactory))
                        }
                        if (opts.timeout) {
                            if (opts.transportOpts) {
                                opts.transportOpts.timeout = opts.timeout;
                            } else {
                                opts.transportOpts = { timeout: opts.timeout };
                            }
                        }
                        return opts as ClientOpts;
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
                    const opts = { ...defaultOpts, ...clientOpts, providers: [...defaultOpts?.providers || EMPTY, ...clientOpts?.providers || EMPTY] };
    
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
