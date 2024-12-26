import {
    Arrayify, Injector, Module, ModuleRef, ModuleType, ModuleWithProviders,
    ProvdierOf, ProviderType, Token, Type, isArray, isNil, lang, toProvider, tokenId
} from '@tsdi/ioc';
import { ConfigMissingExecption, createHandler } from '@tsdi/core';
import { DefaultResponseFactory, HybirdProtocols, ResponseFactory, Protocols } from '@tsdi/common';
import { ClientIncomingFactory, ClientOutgoingFactory, NotImplementedExecption, StatusAdapter, TransportPacketModule } from '@tsdi/common/transport';
import { AbstractClient } from './AbstractClient';
import { ClientBackend } from './backend';
import { ClientCodingsModule } from './codings/client.codings.module';
import { ClientEndpointCodingsHanlders } from './codings/codings.handlers';
import { BodyContentInterceptor } from './interceptors/body';
import { ClientOpts } from './options';
import { UrlRedirector } from './redirector';
import { ClientTransportFactory } from './transport';


/**
 * Client Module.
 */
@Module({
    imports: [
        TransportPacketModule,
        ClientCodingsModule
    ],
    providers: [
        // DefaultClientTransportFactory,
        BodyContentInterceptor,
        UrlRedirector
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
        return provideClient(options as any);
    }

}

/**
 * provide client module with options.
 * @param options module options.
 * @returns 
 */
export function provideClient(options: ClientModuleConfig & ClientTokenOpts): ModuleWithProviders<ClientModule>;
/**
 * provide client module with options.
 * @param options module options.
 * @returns 
 */
export function provideClient(options: Array<ClientModuleConfig & ClientTokenOpts>): ModuleWithProviders<ClientModule>;
/**
 * provide client module with options.
 * @param options module options.
 * @returns 
 */
export function provideClient(options: Arrayify<ClientModuleConfig & ClientTokenOpts>): ModuleWithProviders<ClientModule> {
    let providers: ProviderType[];
    if (isArray(options)) {
        providers = []
        options.forEach((op, idx) => {
            providers.push(...clientProviders(op, idx));
        })
    } else {
        providers = clientProviders(options);
    }

    return {
        providers,
        module: ClientModule
    }
}


/**
 * Client module config.
 */
export interface ClientModuleConfig {
    /**
     * imports modules
     */
    imports?: ModuleType[];
    /**
     * client options.
     */
    clientOpts?: ClientOpts;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];

    /**
     * is microservice client or not.
     */
    microservice?: boolean;
}

/**
 * Client module options.
 */
export interface ClientModuleOpts extends ClientModuleConfig {
    /**
     * transport
     */
    transport: Protocols | HybirdProtocols;
    /**
     * client type
     */
    clientType: Type<AbstractClient>;
    /**
     * client provider
     */
    clientProvider?: ProvdierOf<AbstractClient>;
    /**
     * response event factory.
     */
    responseFactory?: ProvdierOf<ResponseFactory>;
    /**
     * client default options
     */
    defaultOpts?: ClientOpts;
    /**
     * as default client.
     */
    asDefault?: boolean | null;
    /**
     * trnsport backend.
     */
    backend?: ProvdierOf<ClientBackend>;
}

/**
 * Client token options.
 */
export interface ClientTokenOpts {

    /**
     * transport protocol.
     */
    transport: Protocols;

    /**
     * client token.
     */
    client?: Token<AbstractClient>;
}


/**
 * global register client modules.
 */
export const CLIENT_MODULES = tokenId<(ClientModuleOpts)[]>('CLIENT_MODULES');


function clientProviders(options: ClientModuleConfig & ClientTokenOpts, idx?: number) {
    return [
        ...options.providers ?? [],
        {
            provider: async (injector) => {
                let defts = injector.get(CLIENT_MODULES, null)?.find(r => r.transport === options.transport && (isNil(options.microservice) ? (r.asDefault || !r.microservice) : r.microservice == options.microservice));
                if (!defts) {
                    try {
                        const m = await import(`@tsdi/${options.transport}`);
                        const transportModuleName = options.transport.charAt(0).toUpperCase() + options.transport.slice(1) + 'Module';
                        if (m[transportModuleName]) {
                            await injector.get(ModuleRef).import(m[transportModuleName]);
                            defts = injector.get(CLIENT_MODULES, []).find(r => r.transport === options.transport && (isNil(options.microservice) ? (r.asDefault || !r.microservice) : r.microservice == options.microservice));
                        }
                        if (!defts) {
                            throw new Error(m[transportModuleName] ? 'has not implemented' : 'not found transport module!')
                        }
                    } catch (err: any) {
                        throw new NotImplementedExecption(`${options.transport} ${options.microservice ? 'microservice client' : 'client'} ${err.message ?? 'has not implemented'}`);
                    }
                }
                const opts = { ...defts, ...options, asDefault: null } as ClientModuleOpts & ClientTokenOpts;
                const clientOpts = {
                    backend: opts.backend ?? ClientBackend,
                    enableTypeChain: true,
                    ...opts.defaultOpts,
                    ...opts.clientOpts,
                    providers: [
                        ...opts.defaultOpts?.providers || [],
                        ...opts.clientOpts?.providers || []
                    ]
                } as ClientOpts & { providers: ProviderType[] };

                if (opts.microservice) {
                    clientOpts.microservice = opts.microservice;
                }

                if (!clientOpts.handlerType) throw new ConfigMissingExecption(`Config Missing handlerType`);


                if (opts.imports) {
                    clientOpts.providers.push({
                        provider: async (injector) => {
                            await injector.useAsync(opts.imports!)
                        }
                    })
                }

                if (!clientOpts.execptionHandlers) {
                    clientOpts.execptionHandlers = [ClientEndpointCodingsHanlders]
                } else {
                    if (isArray(clientOpts.execptionHandlers)) {
                        clientOpts.execptionHandlers.push(ClientEndpointCodingsHanlders)
                    } else {
                        clientOpts.execptionHandlers = [clientOpts.execptionHandlers, ClientEndpointCodingsHanlders];
                    }
                }

                clientOpts.providers.push(toProvider(ResponseFactory, clientOpts.responseFactory || DefaultResponseFactory))

                if (clientOpts.statusAdapter) {
                    clientOpts.providers.push(toProvider(StatusAdapter, clientOpts.statusAdapter))
                }

                if (clientOpts.incomingFactory) {
                    clientOpts.providers.push(toProvider(ClientIncomingFactory, clientOpts.incomingFactory))
                }

                if (clientOpts.outgoingFactory) {
                    clientOpts.providers.push(toProvider(ClientOutgoingFactory, clientOpts.outgoingFactory))
                }

                if (clientOpts.transportFactory && clientOpts.transportFactory !== ClientTransportFactory) {
                    clientOpts.providers.push(toProvider(ClientTransportFactory, clientOpts.transportFactory))
                }


                const providers: ProviderType[] = [];

                if (opts.clientProvider) {
                    providers.push(toProvider(opts.clientType, opts.clientProvider));
                }
                providers.push({
                    provide: clientOpts.handlerType,
                    useFactory: (injector: Injector) => {
                        return createHandler(injector, lang.deepClone(clientOpts));
                    },
                    deps: [Injector]
                });

                return opts.client ? [
                    {
                        provide: opts.client,
                        useFactory: (injector: Injector) => {
                            return injector.resolve(opts.clientType, providers);
                        },
                        deps: [Injector]

                    }
                ] : providers;
            }
        }
    ] as ProviderType[];
}
