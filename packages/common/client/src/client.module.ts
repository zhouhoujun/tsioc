import { Arrayify, CtorType, EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, isArray, toProvider } from '@tsdi/ioc';
import { MicroTransportBackend, TransportBackend } from './backend';
import { ClientOpts, ClientsOpts, MicroClientOpts, MicroClientsOpts } from './options';
import { ClientHandler, MicroClientHandler } from './handler';
import { NotImplementedExecption, Transport, TransportRequired, TransportSessionFactory } from '@tsdi/common';
import { Client, MicroClient } from './Client';
import { createHandler } from '@tsdi/core';


export interface MicroClientModuleConfig {
    /**
     * microservice client options.
     */
    clientOpts?: MicroClientOpts | MicroClientsOpts[];
    /**
     * microservice client default options
     */
    defaultOpts?: MicroClientOpts;
    /**
     * micro client handler provider
     */
    handler?: ProvdierOf<MicroClientHandler>;
    /**
     * transport session type.
     */
    sessionFactoryType?: Type<TransportSessionFactory>;
    /**
     * session factory
     */
    sessionFactory?: ProvdierOf<TransportSessionFactory>;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];
}

export interface MicroClientModuleOpts extends MicroClientModuleConfig {
    /**
     * microservice client type
     */
    clientType: Type<MicroClient>;
    /**
     * microservice client options token.
     */
    clientOptsToken: Token<MicroClientOpts>;
    /**
     * client providers
     */
    client?: ProvdierOf<Client>;
    /**
     * microservice client handler type.
     */
    hanlderType: Type<MicroClientHandler>;
}

export interface ClientModuleConfig {
    /**
     * client options.
     */
    clientOpts?: ClientOpts | ClientsOpts[];
    /**
     * client default options
     */
    defaultOpts?: ClientOpts;
    /**
     * client handler provider
     */
    handler?: ProvdierOf<ClientHandler>;
    /**
     * transport session type.
     */
    sessionFactoryType?: Type<TransportSessionFactory>;
    /**
     * session factory
     */
    sessionFactory?: ProvdierOf<TransportSessionFactory>;
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



const micros: Record<string, MicroClientModuleOpts> = {};
const clients: Record<string, ClientModuleOpts> = {};



@Module({
    providers: [
        MicroTransportBackend,
        TransportBackend
    ]
})
export class ClientModule {

    /**
     * import microservice client module with options.
     * @param options module options.
     * @returns 
     */
    static forMicroservice(options: MicroClientModuleConfig & TransportRequired): ModuleWithProviders<ClientModule>;
    /**
     * import microservice client module with options.
     * @param options module options.
     * @returns 
     */
    static forMicroservice(options: Array<MicroClientModuleConfig & TransportRequired>): ModuleWithProviders<ClientModule>;
    /**
     * import microservice client module with options.
     * @param options module options.
     * @returns 
     */
    static forMicroservice(options: Arrayify<MicroClientModuleConfig & TransportRequired>) {
        let providers: ProviderType[];
        if (isArray(options)) {
            providers = []
            options.forEach(op => {
                const opts = micros[op.transport];
                if (!opts) throw new NotImplementedExecption(op.transport + ' micro client has not implemented');
                providers.push(...mircoClientProviders({ ...opts, ...op }));
            })
        } else {
            const opts = micros[options.transport];
            if (!opts) throw new NotImplementedExecption(options.transport + ' micro client has not implemented');
            providers = mircoClientProviders({ ...opts, ...options });
        }

        return {
            providers,
            module: ClientModule
        }
    }

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

export interface ClientImpl {
    /**
     * set microservice client implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    setMicro(transport: Transport, options: MicroClientModuleOpts): ClientImpl;

    /**
     * set client implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    set(transport: Transport, options: ClientModuleOpts): ClientImpl;
}

export const CLIENT_IMPL: ClientImpl = {

    /**
     * set microservice client implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    setMicro(transport: Transport, options: MicroClientModuleOpts) {
        micros[transport] = options;
        return CLIENT_IMPL;
    },

    /**
     * set client implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    set(transport: Transport, options: ClientModuleOpts) {
        clients[transport] = options;
        return CLIENT_IMPL;
    }
}

function mircoClientProviders(options: MicroClientModuleOpts) {

    const { clientType, hanlderType, clientOptsToken, sessionFactoryType, defaultOpts } = options;
    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY,
        ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
            provide: opts.client,
            useFactory: (injector: Injector) => {
                return injector.resolve(clientType, [{ provide: clientOptsToken, useValue: { ...defaultOpts, ...opts, providers: [...defaultOpts?.providers || EMPTY, ...opts.providers || EMPTY] } }]);
            },
            deps: [Injector]
        }))
            : [{ provide: clientOptsToken, useValue: { ...defaultOpts, ...options.clientOpts, providers: [...defaultOpts?.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
    ];

    if (options.client) {
        providers.push(toProvider(clientType, options.client));
    } else {
        providers.push(clientType);
    }

    if (options.handler) {
        providers.push(toProvider(hanlderType, options.handler))
    } else {
        providers.push({
            provide: hanlderType,
            useFactory: (injector: Injector, opts: MicroClientOpts) => {
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
    if (options.sessionFactory) {
        providers.push(toProvider(sessionFactoryType ?? TransportSessionFactory, options.sessionFactory))
    } else if (sessionFactoryType) {
        providers.push(sessionFactoryType);
    }

    return providers
}


function clientProviders(options: ClientModuleOpts) {
    const { clientType, hanlderType, clientOptsToken, defaultOpts, sessionFactoryType } = options;
    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY,
        ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
            provide: opts.client,
            useFactory: (injector: Injector) => {
                return injector.resolve(clientType, [{ provide: clientOptsToken, useValue: { ...defaultOpts, ...opts, providers: [...defaultOpts?.providers || EMPTY, ...opts.providers || EMPTY] } }]);
            },
            deps: [Injector]
        }))
            : [{ provide: clientOptsToken, useValue: { ...defaultOpts, ...options.clientOpts, providers: [...defaultOpts?.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
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
    if (options.sessionFactory) {
        providers.push(toProvider(sessionFactoryType ?? TransportSessionFactory, options.sessionFactory))
    } else if (sessionFactoryType) {
        providers.push(sessionFactoryType);
    }


    return providers;
}
