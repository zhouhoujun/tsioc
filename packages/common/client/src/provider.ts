import { ArgumentException, Injector, Module, ModuleRef, ModuleWithProviders, ProvdierOf, Provider, Token, getToken, isArray, isFunction, isString, lang, toProvider, token } from '@tsdi/ioc';
import { ConfigMissingException, createHandler } from '@tsdi/core';
import { createRequestHandler, DefaultResponseFactory, NotImplementedException, Protocols, RequestHandlerFn, RequestInterceptorFn, RequestInterceptorLike } from '@tsdi/common';
import { isMicroTransport, toTransportModuleName, TransportPacketModule } from '@tsdi/common/transport';
import { RequestBackend } from './backend';
import { UrlRedirector } from './transport';
import { ClientConfig } from './options';
import { ClientOptions, ClientModuleOpts } from './client.options';
import { getClientHanlderToken, getClientOptionsToken, getClientToken, getInterceptorFnsToken, getInterceptorsToken, getLegacyInterceptorToken } from './tokens';



/**
 * Identifies a particular kind of `ClientFeature`.
 *
 * @publicApi
 */
export enum FeatureKind {
    Configure,
    Interceptors,
    // LegacyInterceptors,
    // CustomXsrfConfiguration,
    // NoXsrfProtection,
    JsonpSupport,
    RequestsMadeViaParent,
    Redirector,
    Fetch,
    Transport,
    Transfer
}

export interface ClientFeature<Kind extends FeatureKind> {
    kind: Kind;
    providers: Provider[];
}

export type ClientFeatureLike<Kind extends FeatureKind> = ClientFeature<Kind> | ((protocol: Protocols, name?: string) => ClientFeature<Kind>);


/**
 * Configures client with features.
 * @param features module options.
 * @returns 
 */
export function provideClient(protocol: Protocols, name: string, ...features: ClientFeatureLike<FeatureKind>[]): Provider[];
/**
 * Configures client with features.
 * @param features module options.
 * @returns 
 */
export function provideClient(protocol: Protocols, ...features: ClientFeatureLike<FeatureKind>[]): Provider[];

/**
 * Configures client with features.
 * @param features module options.
 * @returns 
 */
export function provideClient(protocol: Protocols, nameOrFeature: string | ClientFeatureLike<FeatureKind>, ...features: ClientFeatureLike<FeatureKind>[]): Provider[] {
    let name: string;
    if (isString(nameOrFeature)) {
        name = nameOrFeature;
    } else {
        name = 'default';
        features.unshift(nameOrFeature);
    }
    const kinds = new Map<FeatureKind, Provider[]>();
    features.forEach(f => {
        const feature = isFunction(f) ? f(protocol, name) : f;
        const pdrs = kinds.get(feature.kind);
        if (pdrs) {
            pdrs.push(...feature.providers);
        } else {
            kinds.set(feature.kind, feature.providers.slice(0));
        }
    });

    if (!kinds.has(FeatureKind.Configure)) {
        throw new ArgumentException(`messings ${protocol} client configure` + (name ? `, ailas with name ${name}` : ''));
    }

    if (!kinds.has(FeatureKind.Transport)) {
        throw new ArgumentException(`messings ${protocol} client transport` + (name ? `, ailas with name ${name}` : ''));
    }

    const providers: Provider[] = [];
    Array.from(kinds.keys()).sort().forEach(k => {
        providers.push(...kinds.get(k)!);
    });

    const handlerToken = getClientHanlderToken(protocol, name);
    const optionsToken = getClientOptionsToken(protocol, name);

    providers.push(
        {
            provide: handlerToken,
            useFactory: (injector: Injector) => {
                // const options = injector.get(optionsToken);
                return createRequestHandler(injector, injector.get(optionsToken));
            },
            deps: [
                Injector
            ]

        }
    );

    return providers;
}

export function makeClientFeature<T extends FeatureKind>(kind: T, providers: Provider[]): ClientFeature<T> {
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
    interceptors: ProvdierOf<RequestInterceptorLike>[],
): ClientFeatureLike<FeatureKind.Interceptors> {
    return (protocol, name) => {
        const token = getInterceptorsToken(protocol, name)
        return makeClientFeature(
            FeatureKind.Interceptors,
            interceptors.map((u) => toProvider(token, u, true))
        );
    }
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
export const CLIENT_MODULES = token<ClientModuleOpts[]>('CLIENT_MODULES');


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
