import { Arrayify, EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, isArray, toProvider } from '@tsdi/ioc';
import { createHandler } from '@tsdi/core';
import { NotImplementedExecption, Transport, TransportRequired, TransportSessionFactory } from '@tsdi/common';
import { TransportBackend } from './backend';
import { ClientOpts } from './options';
import { ClientHandler } from './handler';
import { Client } from './Client';


export interface ClientModuleConfig {
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
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
    client?: ProvdierOf<Client>;
    /**
     * client handler type.
     */
    hanlderType: Type<ClientHandler>;
}


const clients: Record<string, ClientModuleOpts> = {};



@Module({
    providers: [
        TransportBackend
    ]
})
export class ClientModule {

    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static forClient(options: ClientModuleConfig & TransportRequired): ModuleWithProviders<ClientModule>;
    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static forClient(options: Array<ClientModuleConfig & TransportRequired>): ModuleWithProviders<ClientModule>;
    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static forClient(options: Arrayify<ClientModuleConfig & TransportRequired>): ModuleWithProviders<ClientModule> {
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


function clientProviders(options: ClientModuleOpts) {
    const { clientType, hanlderType, clientOptsToken, defaultOpts, clientOpts } = options;

    const opts = { ...defaultOpts, ...clientOpts, providers: [...defaultOpts?.providers || EMPTY, ...clientOpts?.providers || EMPTY] };

    if (opts.sessionFactory) {
        opts.providers.push(toProvider(TransportSessionFactory, opts.sessionFactory))
    } 

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY,
        clientOpts?.client ? {
            provide: clientOpts.client,
            useFactory: (injector: Injector) => {
                return injector.resolve(clientType, [{ provide: clientOptsToken, useValue: opts }]);
            },
            deps: [Injector]
        }
            : { provide: clientOptsToken, useValue: opts }
    ];

    if (options.client) {
        providers.push(toProvider(clientType, options.client));
    } else if (clientType) {
        providers.push(clientType);
    }

    if (options.handler) {
        providers.push(toProvider(hanlderType, options.handler))
    } else {
        providers.push({
            provide: hanlderType,
            useFactory: (injector: Injector, opts: ClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
                    Object.assign(opts, defaultOpts);
                    injector.setValue(clientOptsToken, opts);
                }
                return createHandler(injector, opts);
            },
            asDefault: true,
            deps: [Injector, clientOptsToken]
        })
    }

    return providers;
}
