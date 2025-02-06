import {
    Arrayify, Injector, Module, ModuleRef, ModuleWithProviders,
    ProviderType, isArray, lang, toProvider, tokenId
} from '@tsdi/ioc';
import { ConfigMissingExecption, createHandler } from '@tsdi/core';
import { DefaultResponseFactory } from '@tsdi/common';
import { isMicroTransport, NotImplementedExecption, TransportPacketModule } from '@tsdi/common/transport';
import { ClientBackend } from './backend';
import { BodyServializetInterceptor } from './interceptors/body';
import { ClientTransportBackend, ClientTransportFactory, DefaultClientTransferFactory, UrlRedirector } from './transport';
import { ClientOpts } from './options';
import { ClientConfigs, ClientModuleOpts } from './client.options';


/**
 * Client Module.
 */
@Module({
    imports: [
        TransportPacketModule,
    ],
    providers: [
        DefaultResponseFactory,
        DefaultClientTransferFactory,
        BodyServializetInterceptor,
        UrlRedirector
    ]
})
export class ClientModule {

    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static register(options: ClientConfigs): ModuleWithProviders<ClientModule>;
    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static register(options: Array<ClientConfigs>): ModuleWithProviders<ClientModule>;
    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static register(options: Arrayify<ClientConfigs>): ModuleWithProviders<ClientModule> {
        return provideClient(options as any);
    }

}

/**
 * provide client module with options.
 * @param options module options.
 * @returns 
 */
export function provideClient(options: ClientConfigs): ModuleWithProviders<ClientModule>;
/**
 * provide client module with options.
 * @param options module options.
 * @returns 
 */
export function provideClient(options: Array<ClientConfigs>): ModuleWithProviders<ClientModule>;
/**
 * provide client module with options.
 * @param options module options.
 * @returns 
 */
export function provideClient(options: Arrayify<ClientConfigs>): ModuleWithProviders<ClientModule> {
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
 * global register client modules.
 */
export const CLIENT_MODULES = tokenId<(ClientModuleOpts)[]>('CLIENT_MODULES');


function clientProviders(options: ClientConfigs, idx?: number) {
    const microservice = isMicroTransport(options);
    return [
        ...options.providers ?? [],
        {
            provider: async (injector) => {
                let defts = injector.get(CLIENT_MODULES, null)?.find(r => r.transport === options.transport && (microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r))));
                if (!defts) {
                    try {
                        const m = await import(`@tsdi/${options.transport}`);
                        const transportModuleName = options.transport.charAt(0).toUpperCase() + options.transport.slice(1) + 'Module';
                        if (m[transportModuleName]) {
                            await injector.get(ModuleRef).import(m[transportModuleName]);
                            defts = injector.get(CLIENT_MODULES, []).find(r => r.transport === options.transport && (microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r))));
                        }
                        if (!defts) {
                            throw new Error(m[transportModuleName] ? 'has not implemented' : 'not found transport module!')
                        }
                    } catch (err: any) {
                        throw new NotImplementedExecption(`${options.transport} ${microservice ? 'microservice client' : 'client'} ${err.message ?? 'has not implemented'}`);
                    }
                }
                const opts = { ...defts, ...options, asDefault: null } as ClientModuleOpts & ClientConfigs;

                const transportOptions = {
                    ...opts.defaultOpts?.transportOptions,
                    ...opts.clientOpts?.transportOptions
                };

                const clientOpts = {
                    backend: opts.backend ?? ClientBackend,
                    enableTypeChain: true,
                    ...opts.defaultOpts,
                    ...opts.clientOpts,
                    transportOptions,
                    providers: [
                        ...opts.defaultOpts?.providers || [],
                        ...opts.clientOpts?.providers || []
                    ]
                } as ClientOpts & { providers: ProviderType[] };

                if (microservice) {
                    clientOpts.microservice = microservice;
                }

                if (!opts.backend) {
                    clientOpts.providers.push({ provide: ClientBackend, useClass: ClientTransportBackend });
                }

                if (!clientOpts.handlerType) throw new ConfigMissingExecption(`Config Missing handlerType`);
                if (!clientOpts.transportFactory || clientOpts.transportFactory == ClientTransportFactory) throw new ConfigMissingExecption(`Config Missing transportFactory`);

                if (opts.imports) {
                    clientOpts.providers.push({
                        provider: async (injector) => {
                            await injector.useAsync(opts.imports!)
                        }
                    })
                }

                clientOpts.providers.push(toProvider(ClientTransportFactory, clientOpts.transportFactory));

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
