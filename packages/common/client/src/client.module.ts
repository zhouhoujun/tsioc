import { Arrayify, EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, getToken, isArray, toFactory, toProvider } from '@tsdi/ioc';
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
     * client default options
     */
    defaultOpts?: ClientOpts;
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
}


const clients: Record<string, ClientModuleOpts> = {};

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
                const opts = clients[op.transport];
                if (!opts) throw new NotImplementedExecption(op.transport + ' client has not implemented');
                providers.push(...clientProviders({ ...opts, ...op }));
            })
        } else {
            const opts = clients[options.transport];
            if (!opts) throw new NotImplementedExecption(options.transport + ' client has not implemented');
            providers = clientProviders({ ...opts, ...options });
        }

        return {
            providers,
            module: ClientModule
        }
    }

}

export interface Clients {

    /**
     * set client implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    register(transport: Transport, options: ClientModuleOpts): Clients;
}

export const CLIENTS: Clients = {
    /**
     * set client implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    register(transport: Transport, options: ClientModuleOpts) {
        clients[transport] = options;
        return CLIENTS;
    }
}


function clientProviders(options: ClientModuleOpts & TransportRequired & ClientTokenOpts) {
    const { client, transport, clientType, hanlderType, clientOptsToken, defaultOpts } = options;

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY
    ];

    if (client) {
        const token = getToken(client, 'options');
        const init = (clientOpts: ClientOpts) => {
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
            opts.providers.push({ provide: clientOptsToken, useExisting: token });
            return opts as ClientOpts;
        }

        providers.push(
            toFactory(token, options.clientOpts!, init),
            {
                provide: client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(clientType, [
                        { provide: clientOptsToken, useExisting: token }
                    ]);
                },
                deps: [Injector]
            }
        );

    } else {
        const init = (clientOpts: ClientOpts) => {
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
            return opts as ClientOpts;
        }

        providers.push(toFactory(clientOptsToken, options.clientOpts!, init))
    }

    if (options.clientProvider) {
        providers.push(toProvider(clientType, options.clientProvider));
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

    return providers;
}
