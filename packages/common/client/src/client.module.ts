import {
    Arrayify, EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType,
    Type, Token, isArray, lang, toProvider, tokenId, ModuleRef, isNil, ModuleType
} from '@tsdi/ioc';
import { createHandler } from '@tsdi/core';
import { HybirdTransport, Transport } from '@tsdi/common';
import { GLOBAL_DECODINGS_INTERCEPTORS, GLOBAL_ENCODINGS_INTERCEPTORS, } from '@tsdi/common/codings';
import { NotImplementedExecption, ResponseEventFactory, StatusAdapter } from '@tsdi/common/transport';
import { ClientOpts } from './options';
import { ClientHandler, GLOBAL_CLIENT_INTERCEPTORS } from './handler';
import { Client } from './Client';
import { TransportBackend } from './backend';
import { BodyContentInterceptor } from './interceptors/body';
import { RestfulRedirector } from './redirector';
import { ClientTransportSessionFactory } from './session';
import { DefaultClientTransportSessionFactory } from './default.session';
import { ClientCodingsModule, RequestEncodeInterceper, ResponseDecodeInterceper } from './codings';
import { DefaultResponseEventFactory } from './response.factory';

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
    transport: Transport | HybirdTransport;
    /**
     * client type
     */
    clientType: Type<Client>;
    /**
     * client providers
     */
    clientProvider?: ProvdierOf<Client>;
    /**
     * client handler type.
     */
    hanlderType: Type<ClientHandler>;
    /**
     * response event factory.
     */
    responseEventFactory?: ProvdierOf<ResponseEventFactory>;
    /**
     * client default options
     */
    defaultOpts?: ClientOpts;
    /**
     * as default client.
     */
    asDefault?: boolean;
    /**
     * trnsport backend.
     */
    backend?: ProvdierOf<TransportBackend>;
}

/**
 * Client token options.
 */
export interface ClientTokenOpts {

    transport: Transport | HybirdTransport;

    /**
     * client token.
     */
    client?: Token<Client>;
}


/**
 * Client Module.
 */
@Module({
    imports: [
        ClientCodingsModule
    ],
    providers: [
        DefaultClientTransportSessionFactory,
        BodyContentInterceptor,
        RestfulRedirector,
        DefaultResponseEventFactory,
        { provide: ResponseEventFactory, useExisting: DefaultResponseEventFactory }
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

}

/**
 * global register client modules.
 */
export const CLIENT_MODULES = tokenId<(ClientModuleOpts)[]>('CLIENT_MODULES');


function clientProviders(options: ClientModuleConfig & ClientTokenOpts, idx?: number) {
    return [
        ...options.providers ?? EMPTY,
        {
            provider: async (injector) => {
                let defts = injector.get(CLIENT_MODULES, EMPTY).find(r => r.transport === options.transport && (isNil(options.microservice) ? (r.asDefault || !r.microservice) : r.microservice == options.microservice));
                if (!defts) {
                    try {
                        const m = await import(`@tsdi/${options.transport}`);
                        const transportModuleName = options.transport.charAt(0).toUpperCase() + options.transport.slice(1) + 'Module';
                        if (m[transportModuleName]) {
                            await injector.get(ModuleRef).import(m[transportModuleName]);
                            defts = injector.get(CLIENT_MODULES, EMPTY).find(r => r.transport === options.transport && (isNil(options.microservice) ? (r.asDefault || !r.microservice) : r.microservice == options.microservice));
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
                    backend: opts.backend ?? TransportBackend,
                    globalInterceptorsToken: GLOBAL_CLIENT_INTERCEPTORS,
                    ...opts.defaultOpts,
                    ...opts.clientOpts,
                    providers: [
                        { provide: GLOBAL_ENCODINGS_INTERCEPTORS, useClass: RequestEncodeInterceper, multi: true },
                        { provide: GLOBAL_DECODINGS_INTERCEPTORS, useClass: ResponseDecodeInterceper, multi: true },
                        ...opts.defaultOpts?.providers || EMPTY,
                        ...opts.clientOpts?.providers || EMPTY
                    ]
                } as ClientOpts & { providers: ProviderType[] };

                if (opts.microservice) {
                    clientOpts.microservice = opts.microservice;
                }

                clientOpts.transportOpts = {
                    name: `${clientOpts.microservice ? ' microservice' : ''} client`,
                    group: opts.transport,
                    subfix: clientOpts.microservice ? '_micro' : '',
                    microservice: clientOpts.microservice,
                    timeout: clientOpts.timeout,
                    transport: opts.transport,
                    ...opts.defaultOpts?.transportOpts,
                    ...opts.clientOpts?.transportOpts,
                    client: true
                };


                if (opts.imports) {
                    clientOpts.providers.push({
                        provider: async (injector) => {
                            await injector.useAsync(opts.imports!)
                        }
                    })
                }

                if (clientOpts.statusAdapter) {
                    clientOpts.providers.push(toProvider(StatusAdapter, clientOpts.statusAdapter))
                }

                if (opts.responseEventFactory) {
                    clientOpts.providers.push(toProvider(ResponseEventFactory, opts.responseEventFactory));
                }

                if (clientOpts.sessionFactory !== ClientTransportSessionFactory) {
                    clientOpts.providers.push(toProvider(ClientTransportSessionFactory, clientOpts.sessionFactory ?? DefaultClientTransportSessionFactory))
                }


                const providers: ProviderType[] = [];

                if (opts.clientProvider) {
                    providers.push(toProvider(opts.clientType, opts.clientProvider));
                }
                providers.push({
                    provide: opts.hanlderType,
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
