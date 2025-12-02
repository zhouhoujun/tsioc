import { Injector, Module, ModuleRef, ModuleWithProviders, Provider, Token, getToken, isArray, isString, lang, toProvider, tokenId } from '@tsdi/ioc';
import { ConfigMissingException, createHandler } from '@tsdi/core';
import { DefaultResponseFactory, NotImplementedException, Protocols, RequestHandlerFn, RequestInterceptorFn } from '@tsdi/common';
import { isMicroTransport, toTransportModuleName, TransportPacketModule } from '@tsdi/common/transport';
import { RequestBackend } from './backend';
import { UrlRedirector } from './transport';
import { ClientConfig } from './options';
import { ClientOptions, ClientModuleOpts } from './client.options';
import { getInterceptorFnsToken, getLegacyInterceptorToken, legacyInterceptorFnFactory } from './interceptors';



/**
 * Identifies a particular kind of `ClientFeature`.
 *
 * @publicApi
 */
export enum FeatureKind {
    Configure,
    Interceptors,
    LegacyInterceptors,
    CustomXsrfConfiguration,
    NoXsrfProtection,
    JsonpSupport,
    RequestsMadeViaParent,
    Fetch,
    Transport,
}

export interface ClientFeature<Kind extends FeatureKind> {
    kind: Kind;
    providers: Provider[];
}


/**
 * Configures client with features.
 * @param features module options.
 * @returns 
 */
export function provideClient(name:string, ...features: ClientFeature<FeatureKind>[]): Provider[];
/**
 * Configures client with features.
 * @param features module options.
 * @returns 
 */
export function provideClient(...features: ClientFeature<FeatureKind>[]): Provider[];

/**
 * Configures client with features.
 * @param features module options.
 * @returns 
 */
export function provideClient(nameOrFeature: string|ClientFeature<FeatureKind>, ...features: ClientFeature<FeatureKind>[]): Provider[] {
    let name:string;
    if(isString(nameOrFeature)){
        name = nameOrFeature;
    } else {
        name = 'default';
        features.unshift(nameOrFeature);
    }
    // const kinds = new Set(features.map(f=> f.kind));
    // if(kinds.has(FeatureKind.Fetch)) {

    // }
    
    const providers: Provider[] = [
        
    ];


    return providers;
}

function makeFeature<T extends FeatureKind>(kind: T, providers: Provider[]): ClientFeature<T> {
    return {
        kind,
        providers
    }
}


/**
 * Adds one or more functional-style client interceptors to the configuration of the `Client`
 * instance.
 *
 * @see {@link RequestInterceptorFn}
 * @see {@link provideClient}
 * @publicApi
 */
export function withInterceptors(
    protocol: Protocols,
    interceptorFns: RequestInterceptorFn[],
): ClientFeature<FeatureKind.Interceptors> {
    return makeFeature(
        FeatureKind.Interceptors,
        interceptorFns.map((interceptorFn) => {
            return {
                provide: getInterceptorFnsToken(protocol),
                useValue: interceptorFn,
                multi: true,
            };
        }),
    );
}






export function withInterceptorsFromDi(protocol: Protocols) {
    const token = getLegacyInterceptorToken(protocol);
    return makeFeature(FeatureKind.LegacyInterceptors, [
        {
            provide: token,
            useValue: legacyInterceptorFnFactory(protocol)
        },
        {
            provide: getInterceptorFnsToken(protocol),
            useExisting: token,
            multi: true,
        },
    ])
}


// /**
//  * provide client module with options.
//  * @param options module options.
//  * @returns 
//  */
// export function provideClient(options: ClientOptions): Provider[];
// /**
//  * provide client module with options.
//  * @param options module options.
//  * @returns 
//  */
// export function provideClient(options: Array<ClientOptions>): Provider[];
// /**
//  * provide client module with options.
//  * @param options module options.
//  * @returns 
//  */
// export function provideClient(options: Arrayify<ClientOptions>): ModuleWithProviders<ClientModule> {
//     let providers: Provider[];
//     if (isArray(options)) {
//         providers = [];
//         options.forEach((op, idx) => {
//             providers.push(clientProviders(op, idx));
//         })
//     } else {
//         providers = clientProviders(options);
//     }

//     return {
//         providers,
//         module: ClientModule
//     }
// }


/**
 * global register client modules.
 */
export const CLIENT_MODULES = tokenId<ClientModuleOpts[]>('CLIENT_MODULES');


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
                        throw new NotImplementedException(`${options.transport} ${microservice ? 'microservice client' : 'client'} ${err.message ?? 'has not implemented'}`);
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
                    backend: opts.backend ?? RequestBackend,
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


                // if (!opts.backend) {
                //     clientOpts.providers.push({ provide: RequestBackend, useClass: RequestTransportBackend });
                // }

                if (!clientOpts.handlerType) throw new ConfigMissingException(`Config Missing handlerType`);
                // if (!clientOpts.transportFactory || clientOpts.transportFactory == ClientTransportFactory) throw new ConfigMissingException(`Config Missing transportFactory`);

                if (opts.imports) {
                    clientOpts.providers.push({
                        provider: async (injector) => {
                            await injector.getInject().useAsync(opts.imports!)
                        }
                    })
                }

                // clientOpts.providers.push(toProvider(ClientTransportFactory, clientOpts.transportFactory));

                // if (!clientOpts.execptionHandlers) {
                //     clientOpts.execptionHandlers = [DefaultExceptionHandlers]
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
                            return injector.getInject().resolve(opts.clientType, providers);
                        },
                        deps: [Injector]

                    }
                ] : providers;
            }
        }
    ] as Provider[];
}
