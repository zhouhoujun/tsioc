import { ArgumentException, Injector, ProvdierOf, Provider, getClassRef, getType, isArray, isFunction, toProvider } from '@tsdi/ioc';
import { matchTransport, TransportConfig, RequestInterceptorLike } from '@tsdi/common';
import { getClientHandlerToken, getClientOptionsToken, getClientInterceptorsToken, getClientTransfersToken, getClientToken } from './tokens';
import { bodyServializeInterceptor } from './interceptors/body';
import { requestTimeoutInterceptor } from './interceptors/timeout';



/**
 * Identifies a particular kind of `ClientFeature`.
 *
 * @publicApi
 */
export enum ClientFeatureKind {
    Configure,
    Interceptors,
    // LegacyInterceptors,
    CustomXsrfConfiguration,
    NoXsrfProtection,
    JsonpSupport,
    RequestsMadeViaParent,
    Redirector,
    BodySerialize,
    Fetch,
    Transport,
    Transfer
}

export interface ClientFeature<Kind extends ClientFeatureKind> {
    kind: Kind;
    config?: TransportConfig;
    providers: Provider[];
}

export interface ClientTransportFeature {
    kind: ClientFeatureKind.Transport;
    config: TransportConfig;
    providers: Provider[];
}

export type ClientFeatureFn<Kind extends Exclude<ClientFeatureKind, ClientFeatureKind.Transport>> = (config: TransportConfig) => ClientFeature<Kind>;


export type ClientFeatureLike<Kind extends ClientFeatureKind> = ClientFeature<Exclude<Kind, ClientFeatureKind.Transport>> | ClientTransportFeature[] | ClientFeatureFn<Exclude<Kind, ClientFeatureKind.Transport>>;



/**
 * Configures client with features.
 * @param features module options.
 * @returns 
 */
export function provideClient(...features: ClientFeatureLike<ClientFeatureKind>[]): Provider[] {

    const transports = features.filter(f => isArray(f)).flatMap(f => f as ClientTransportFeature[]);

    if (!transports.length) {
        throw new ArgumentException('client transport feature is required.');
    }

    const providers: Provider[] = [];

    transports.map(ts => {
        const kinds = new Map<ClientFeatureKind, Provider[]>();
        const config = ts.config;
        features.forEach(f => {
            if (isArray(f)) {
                return;
            }
            const feature = isFunction(f) ? f(config) : f;
            if (feature.config && !matchTransport(feature.config, config)) {
                return;
            }
            const pdrs = kinds.get(feature.kind);
            if (pdrs) {
                pdrs.push(...feature.providers);
            } else {
                kinds.set(feature.kind, feature.providers.slice(0));
            }
        });

        // if (!kinds.has(FeatureKind.Configure)) {
        //     throw new ArgumentException(`messings ${protocol} client configure` + (name ? `, ailas with name ${name}` : ''));
        // }

        // if (!kinds.has(ClientFeatureKind.Transport)) {
        //     throw new ArgumentException(`messings ${config.protocol}${config.microservice ? ' microservice' : ''} client transport` + (config.name ? `, ailas with name ${config.name}` : ''));
        // }

        Array.from(kinds.keys()).sort().forEach(k => {
            providers.push(...kinds.get(k)!);
        });

        providers.push(
            ...ts.providers
        );

    });

    return providers;

}

export function makeClientFeature<T extends ClientFeatureKind>(kind: T, providers: Provider[], config?: TransportConfig): ClientFeature<T> {
    return {
        kind,
        config,
        providers
    }
}


/**
 * Adds one or more  client interceptors to the configuration of the `Client`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideClient}
 * @publicApi
 */
export function withClientInterceptors(
    ...interceptors: ProvdierOf<RequestInterceptorLike>[]
): ClientFeatureFn<ClientFeatureKind.Interceptors> {
    return (config) => {
        const token = getClientInterceptorsToken(config.transport, config.microservice)
        return makeClientFeature(
            ClientFeatureKind.Interceptors,
            interceptors.map((u) => toProvider(token, u, true)),
            config
        );
    }
}


/**
 * Adds one or more client transfers interceptors to the configuration of the `Client`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideClient}
 * @publicApi
 */
export function withClientTransfers(
    ...interceptors: ProvdierOf<RequestInterceptorLike>[]
): ClientFeatureFn<ClientFeatureKind.Transfer> {
    return (config) => {
        const token = getClientTransfersToken(config.transport, config.microservice)
        return makeClientFeature(
            ClientFeatureKind.Transfer,
            interceptors.map((u) => toProvider(token, u, true)),
            config
        );
    }
}

/**
 * Adds timeout client interceptor to the configuration of the `Client`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideClient}
 * @publicApi
 */
export function withClientTimeout(timeout?: number): ClientFeatureFn<ClientFeatureKind.Interceptors> {
    return (config) => {
        const token = getClientInterceptorsToken(config.transport, config.microservice)
        return makeClientFeature(
            ClientFeatureKind.Interceptors,
            [{
                provide: token,
                useValue: requestTimeoutInterceptor,
                multi: true
            }],
            config
        );
    }
}


/**
 * Adds body serialize client interceptor to the configuration of the `Client`
 * instance.
 *
 * @see {@link RequestInterceptorLike}
 * @see {@link provideClient}
 * @publicApi
 */
export function withClientBodySerialize(): ClientFeatureFn<ClientFeatureKind.BodySerialize> {
    return (config) => {
        const token = getClientInterceptorsToken(config.transport, config.microservice)
        return makeClientFeature(
            ClientFeatureKind.BodySerialize,
            [{
                provide: token,
                useValue: bodyServializeInterceptor,
                multi: true
            }],
            config
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


// /**
//  * global register client modules.
//  */
// export const CLIENT_MODULES = token<ClientModuleOpts[]>('CLIENT_MODULES');


// function clientProviders(options: ClientOptions, idx?: number) {
//     const microservice = isMicroTransport(options);
//     return [
//         options.providers ?? [],
//         {
//             provider: async (injector) => {
//                 const transportName = toTransportModuleName(options.transport);
//                 let defts = injector.get(CLIENT_MODULES, null)?.find(r => (r.transport === options.transport || r.transport == transportName) && (microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r))));
//                 if (!defts) {
//                     try {
//                         const m = await import(`@tsdi/${transportName}`);
//                         const transportModuleName = transportName.charAt(0).toUpperCase() + transportName.slice(1) + 'Module';
//                         if (m[transportModuleName]) {
//                             await injector.get(ModuleRef).import(m[transportModuleName]);
//                             defts = injector.get(CLIENT_MODULES, []).find(r => (r.transport === options.transport || r.transport == transportName) && (microservice ? isMicroTransport(r) : (r.asDefault || !isMicroTransport(r))));
//                         }
//                         if (!defts) {
//                             throw new Error(m[transportModuleName] ? 'has not implemented' : 'not found transport module!')
//                         }
//                     } catch (err: any) {
//                         throw new NotImplementedException(`${options.transport} ${microservice ? 'microservice client' : 'client'} ${err.message ?? 'has not implemented'}`);
//                     }
//                 }
//                 const opts = { ...defts, ...options, asDefault: null } as ClientModuleOpts & ClientOptions;


//                 const cloneOpts = lang.deepClone(opts.config, opts.defaultConfig, (n, value, deft) => {
//                     if (n == 'providers') {
//                         return [value, deft];
//                     }
//                     return value;
//                 });
//                 const clientOpts = {
//                     backend: opts.backend ?? RequestBackend,
//                     enableTypeChain: true,
//                     ...cloneOpts
//                 } as ClientConfig & { providers: Provider[] };

//                 if (!clientOpts.providers) {
//                     clientOpts.providers = [];
//                 }

//                 if (microservice) {
//                     clientOpts.microservice = microservice;
//                 }
//                 if (!clientOpts.protocol) {
//                     clientOpts.protocol = options.transport
//                 }


//                 // if (!opts.backend) {
//                 //     clientOpts.providers.push({ provide: RequestBackend, useClass: RequestTransportBackend });
//                 // }

//                 if (!clientOpts.handlerType) throw new ConfigMissingException(`Config Missing handlerType`);
//                 // if (!clientOpts.transportFactory || clientOpts.transportFactory == ClientTransportFactory) throw new ConfigMissingException(`Config Missing transportFactory`);

//                 if (opts.imports) {
//                     clientOpts.providers.push({
//                         provider: async (injector) => {
//                             await injector.getInject().useAsync(opts.imports!)
//                         }
//                     })
//                 }

//                 // clientOpts.providers.push(toProvider(ClientTransportFactory, clientOpts.transportFactory));

//                 // if (!clientOpts.execptionHandlers) {
//                 //     clientOpts.execptionHandlers = [DefaultExceptionHandlers]
//                 // }


//                 const providers: Provider[] = [];

//                 if (opts.clientProvider) {
//                     providers.push(toProvider(opts.clientType, opts.clientProvider));
//                 }
//                 providers.push({
//                     provide: clientOpts.handlerType,
//                     useFactory: (injector: Injector) => {
//                         return createHandler(injector, lang.deepClone(clientOpts));
//                     },
//                     deps: [Injector]
//                 });

//                 return opts.client ? [
//                     {
//                         provide: opts.client,
//                         useFactory: (injector: Injector) => {
//                             return injector.getInject().resolve(opts.clientType, providers);
//                         },
//                         deps: [Injector]

//                     }
//                 ] : providers;
//             }
//         }
//     ] as Provider[];
// }
