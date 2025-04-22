import {
    Arrayify, Injector, Module, ModuleRef, ModuleWithProviders,
    Provider, isArray, lang, toProvider, tokenId
} from '@tsdi/ioc';
import { ConfigMissingExecption, createHandler } from '@tsdi/core';
import { DefaultResponseFactory } from '@tsdi/common';
import { isMicroTransport, NotImplementedExecption, toTransportModuleName, TransportPacketModule } from '@tsdi/common/transport';
import { ClientBackend } from './backend';
import { ClientTransportBackend, ClientTransportFactory, DefaultClientTransferFactory, UrlRedirector } from './transport';
import { ClientConfig } from './options';
import { ClientOptions, ClientModuleOpts } from './client.options';


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
        UrlRedirector
    ]
})
export class ClientModule {

    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static register(options: ClientOptions): ModuleWithProviders<ClientModule>;
    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static register(options: Array<ClientOptions>): ModuleWithProviders<ClientModule>;
    /**
     * import client module with options.
     * @param options module options.
     * @returns 
     */
    static register(options: Arrayify<ClientOptions>): ModuleWithProviders<ClientModule> {
        return provideClient(options as any);
    }

}

/**
 * provide client module with options.
 * @param options module options.
 * @returns 
 */
export function provideClient(options: ClientOptions): ModuleWithProviders<ClientModule>;
/**
 * provide client module with options.
 * @param options module options.
 * @returns 
 */
export function provideClient(options: Array<ClientOptions>): ModuleWithProviders<ClientModule>;
/**
 * provide client module with options.
 * @param options module options.
 * @returns 
 */
export function provideClient(options: Arrayify<ClientOptions>): ModuleWithProviders<ClientModule> {
    let providers: Provider[];
    if (isArray(options)) {
        providers = []
        options.forEach((op, idx) => {
            providers.push(clientProviders(op, idx));
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


function clientProviders(options: ClientOptions, idx?: number) {
    const microservice = isMicroTransport(options);
    return [
        options.providers ?? [],
        {
            provider: async (injector) => {
                const transportName = toTransportModuleName(options.transport);
                let defts = injector.get(CLIENT_MODULES, null)?.find(r => (r.transport === options.transport || r.transport == transportName) && (microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r))));
                if (!defts) {
                    try {
                        const m = await import(`@tsdi/${transportName}`);
                        const transportModuleName = transportName.charAt(0).toUpperCase() + transportName.slice(1) + 'Module';
                        if (m[transportModuleName]) {
                            await injector.get(ModuleRef).import(m[transportModuleName]);
                            defts = injector.get(CLIENT_MODULES, []).find(r => (r.transport === options.transport || r.transport == transportName) && (microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r))));
                        }
                        if (!defts) {
                            throw new Error(m[transportModuleName] ? 'has not implemented' : 'not found transport module!')
                        }
                    } catch (err: any) {
                        throw new NotImplementedExecption(`${options.transport} ${microservice ? 'microservice client' : 'client'} ${err.message ?? 'has not implemented'}`);
                    }
                }
                const opts = { ...defts, ...options, asDefault: null } as ClientModuleOpts & ClientOptions;


                const cloneOpts = lang.deepClone(opts.config, opts.defaultConfig, (n, value, deft) => {
                    if (n == 'providers') {
                        return [value, deft];
                    }
                    return value;
                });
                const clientOpts = {
                    backend: opts.backend ?? ClientBackend,
                    enableTypeChain: true,
                    ...cloneOpts
                } as ClientConfig & { providers: Provider[] };

                if (!clientOpts.providers) {
                    clientOpts.providers = [];
                }

                if (microservice) {
                    clientOpts.microservice = microservice;
                }
                if (!clientOpts.protocol) {
                    clientOpts.protocol = options.transport
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

                // if (!clientOpts.execptionHandlers) {
                //     clientOpts.execptionHandlers = [DefaultExecptionHandlers]
                // }


                const providers: Provider[] = [];

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
    ] as Provider[];
}
