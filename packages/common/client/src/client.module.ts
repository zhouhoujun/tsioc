import {
    Arrayify, EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType,
    Type, Token, isArray, lang, toProvider, tokenId, toProviders,
    ClassType,
    ModuleRef,
    isNil
} from '@tsdi/ioc';
import { createHandler } from '@tsdi/core';
import { CodingsModule, DECODINGS_INTERCEPTORS, ENCODINGS_INTERCEPTORS, HybirdTransport, NotImplementedExecption, ResponseEventFactory, StatusAdapter, Transport } from '@tsdi/common/transport';
import { ClientOpts } from './options';
import { ClientHandler, GLOBAL_CLIENT_INTERCEPTORS } from './handler';
import { Client } from './Client';
import { TransportBackend } from './backend';
import { BodyContentInterceptor } from './interceptors/body';
import { RestfulRedirector } from './redirector';
import { ClientTransportSessionFactory } from './session';
import { ClientDuplexTransportSessionFactory } from './duplex.session';
import { ClientCodingsModule, RequestEncoder, ResponseDecoder } from './codings';
import { DefaultResponseEventFactory } from './response.factory';

/**
 * Client module config.
 */
export interface ClientModuleConfig {
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
        ClientCodingsModule,
        CodingsModule,
    ],
    providers: [
        ClientDuplexTransportSessionFactory,
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
                const clientOpts = { backend: opts.backend ?? TransportBackend, globalInterceptorsToken: GLOBAL_CLIENT_INTERCEPTORS, ...opts.defaultOpts, ...opts.clientOpts, providers: [...opts.defaultOpts?.providers || EMPTY, ...opts.clientOpts?.providers || EMPTY] } as ClientOpts & { providers: ProviderType[] };

                if (opts.microservice) {
                    clientOpts.microservice = opts.microservice;
                }
                if (!clientOpts.transportOpts) {
                    clientOpts.transportOpts = {};
                }
                clientOpts.transportOpts.client = true;
                clientOpts.transportOpts.transport = opts.transport;
                if (clientOpts.timeout) {
                    clientOpts.transportOpts.timeout = clientOpts.timeout;
                }
                if (clientOpts.microservice) {
                    clientOpts.transportOpts.microservice = clientOpts.microservice;
                }

                if (clientOpts.statusAdapter) {
                    clientOpts.providers.push(toProvider(StatusAdapter, clientOpts.statusAdapter))
                }

                clientOpts.providers.push(...toProviders(ENCODINGS_INTERCEPTORS, clientOpts.transportOpts.encodeInterceptors ?? [RequestEncoder], true));
                clientOpts.providers.push(...toProviders(DECODINGS_INTERCEPTORS, clientOpts.transportOpts.decodeInterceptors ?? [ResponseDecoder], true));

                if (clientOpts.sessionFactory && clientOpts.sessionFactory !== ClientTransportSessionFactory) {
                    clientOpts.providers.push(toProvider(ClientTransportSessionFactory, clientOpts.sessionFactory))
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
