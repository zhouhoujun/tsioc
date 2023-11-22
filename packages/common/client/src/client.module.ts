import { ArgumentExecption, Arrayify, EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, getToken, isArray, lang, toFactory, toProvider, tokenId } from '@tsdi/ioc';
import { createHandler } from '@tsdi/core';
import { HybirdTransport, NotImplementedExecption, Redirector, Transport } from '@tsdi/common';
import { TransportBackend } from './backend';
import { ClientOpts } from './options';
import { ClientHandler, GLOBAL_CLIENT_INTERCEPTORS } from './handler';
import { Client } from './Client';
import { ClientTransportSessionFactory } from './transport/session';
import { InterceptingResponseDecoder, InterceptingReuqestEncoder, REQUEST_ENCODER_INTERCEPTORS, RESPONSE_DECODER_INTERCEPTORS, RequestBackend, RequestEncoder, ResponseBackend, ResponseDecoder } from './transport/codings';
import {
    BufferResponseDecordeInterceptor, CatchErrorResponseDecordeInterceptor, CompressResponseDecordeInterceptor, EmptyResponseDecordeInterceptor,
    ErrorResponseDecordeInterceptor, PayloadStreamResponseDecordeInterceptor, RedirectResponseDecordeInterceptor, StreamResponseDecordeInterceptor, TransportResponseDecordeBackend
} from './transport/decoders';
import { TransportRequestEncodeBackend, OutgoingPipeEncodeInterceptor, RequestBufferFinalizeEncodeInterceptor, SubpacketRequestEncodeInterceptor } from './transport/encoders';
import { DefaultRedirector } from './redirector';
import { ClientDuplexTransportSessionFactory } from './impl/duplex.session';
import { ClientTopicTransportSessionFactory } from './impl/topic.session';


export interface ClientModuleConfig {
    /**
     * client options.
     */
    clientOpts?: ProvdierOf<ClientOpts>;
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
     * transport
     */
    transport: Transport | HybirdTransport;
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
    clientProvider?: ProvdierOf<Client>;
    /**
     * client handler type.
     */
    hanlderType: Type<ClientHandler>;
    /**
     * client default options
     */
    defaultOpts?: ClientOpts;
}


export interface ClientTokenOpts {

    transport: Transport | HybirdTransport;

    /**
     * client token.
     */
    client?: Token<Client>;
}


@Module({
    providers: [
        TransportBackend,

        DefaultRedirector,
        { provide: Redirector, useExisting: DefaultRedirector, asDefault: true },

        RequestBufferFinalizeEncodeInterceptor,
        OutgoingPipeEncodeInterceptor,
        SubpacketRequestEncodeInterceptor,
        { provide: REQUEST_ENCODER_INTERCEPTORS, useExisting: RequestBufferFinalizeEncodeInterceptor, multi: true },
        { provide: REQUEST_ENCODER_INTERCEPTORS, useExisting: OutgoingPipeEncodeInterceptor, multi: true },
        { provide: REQUEST_ENCODER_INTERCEPTORS, useExisting: SubpacketRequestEncodeInterceptor, multi: true },

        TransportRequestEncodeBackend,
        { provide: RequestBackend, useExisting: TransportRequestEncodeBackend },

        InterceptingReuqestEncoder,
        { provide: RequestEncoder, useExisting: InterceptingReuqestEncoder },


        CatchErrorResponseDecordeInterceptor,
        StreamResponseDecordeInterceptor,
        PayloadStreamResponseDecordeInterceptor,
        BufferResponseDecordeInterceptor,
        EmptyResponseDecordeInterceptor,
        RedirectResponseDecordeInterceptor,
        ErrorResponseDecordeInterceptor,
        CompressResponseDecordeInterceptor,
        { provide: RESPONSE_DECODER_INTERCEPTORS, useExisting: CatchErrorResponseDecordeInterceptor, multi: true },
        { provide: RESPONSE_DECODER_INTERCEPTORS, useExisting: StreamResponseDecordeInterceptor, multi: true },
        { provide: RESPONSE_DECODER_INTERCEPTORS, useExisting: PayloadStreamResponseDecordeInterceptor, multi: true },
        { provide: RESPONSE_DECODER_INTERCEPTORS, useExisting: BufferResponseDecordeInterceptor, multi: true },
        { provide: RESPONSE_DECODER_INTERCEPTORS, useExisting: EmptyResponseDecordeInterceptor, multi: true },
        { provide: RESPONSE_DECODER_INTERCEPTORS, useExisting: RedirectResponseDecordeInterceptor, multi: true },
        { provide: RESPONSE_DECODER_INTERCEPTORS, useExisting: ErrorResponseDecordeInterceptor, multi: true },
        { provide: RESPONSE_DECODER_INTERCEPTORS, useExisting: CompressResponseDecordeInterceptor, multi: true },
        TransportResponseDecordeBackend,
        { provide: ResponseBackend, useExisting: TransportResponseDecordeBackend },

        InterceptingResponseDecoder,
        { provide: ResponseDecoder, useClass: InterceptingResponseDecoder },

        ClientDuplexTransportSessionFactory,
        ClientTopicTransportSessionFactory
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
            options.forEach(op => {
                providers.push(...clientProviders(op));
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


function clientProviders(options: ClientModuleConfig & ClientTokenOpts) {
    const { client, transport } = options;

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY
    ];
    const moduleOptsToken: Token<ClientModuleOpts> = getToken<any>(client ?? transport, 'client_module');

    providers.push(toFactory(moduleOptsToken, options, {
        init: (options, injector) => {
            const defts = injector.get(CLIENT_MODULES).find(r => r.transport === transport);
            if (!defts) throw new NotImplementedExecption(options.transport + ' client has not implemented');
            return { ...defts, ...options } as ClientModuleOpts;
        },
        onRegistered: (injector) => {
            const { clientType, clientProvider, hanlderType, clientOptsToken, defaultOpts } = injector.get(moduleOptsToken);

            const providers = [];
            if (clientProvider) {
                providers.push(toProvider(clientType, clientProvider));
            }
            if (options.handler) {
                providers.push(toProvider(hanlderType, options.handler))
            } else {
                providers.push({
                    provide: hanlderType,
                    useFactory: (injector: Injector, opts: ClientOpts) => {
                        return createHandler(injector, opts);
                    },
                    asDefault: true,
                    deps: [Injector, clientOptsToken]
                })
            }
            if (!client) {
                providers.push(toFactory(clientOptsToken, options.clientOpts!, {
                    init: (clientOpts: ClientOpts) => {

                        const opts = { globalInterceptorsToken: GLOBAL_CLIENT_INTERCEPTORS, ...lang.deepClone(defaultOpts), ...clientOpts, providers: [...defaultOpts?.providers || EMPTY, ...clientOpts?.providers || EMPTY] } as ClientOpts & { providers: ProviderType[] };
                        if (opts.sessionFactory) {
                            opts.providers.push(toProvider(ClientTransportSessionFactory, opts.sessionFactory))
                        }

                        if (opts.strategy) {
                            const strategy = opts.strategy;
                            if (!strategy) throw new ArgumentExecption('The configured transport packet strategy is empty.')
                            if (strategy.encoder) {
                                opts.providers.push(toProvider(RequestEncoder, strategy.encoder))
                            }

                            if (strategy.decoder) {
                                opts.providers.push(toProvider(ResponseDecoder, strategy.decoder))
                            }
                        }

                        if (opts.timeout) {
                            if (opts.transportOpts) {
                                opts.transportOpts.timeout = opts.timeout;
                            } else {
                                opts.transportOpts = { timeout: opts.timeout };
                            }
                        }
                        return opts;
                    }
                }))
            }
            injector.inject(providers);
        }
    }));



    if (client) {
        const token = getToken(client, 'options');
        providers.push(
            toFactory(token, options.clientOpts!, {
                init: (clientOpts: ClientOpts, injector: Injector) => {
                    const { defaultOpts, clientOptsToken } = injector.get(moduleOptsToken);
                    const opts = { ...lang.deepClone(defaultOpts), ...clientOpts, providers: [...defaultOpts?.providers || EMPTY, ...clientOpts?.providers || EMPTY] };

                    if (opts.timeout) {
                        if (opts.transportOpts) {
                            opts.transportOpts.timeout = opts.timeout;
                        } else {
                            opts.transportOpts = { timeout: opts.timeout };
                        }
                    }
                    if (opts.sessionFactory) {
                        opts.providers.push(toProvider(ClientTransportSessionFactory, opts.sessionFactory))
                    }

                    if (opts.strategy) {
                        const strategy = opts.strategy;
                        if (!strategy) throw new ArgumentExecption('The configured transport packet strategy is empty.')
                        if (strategy.encoder) {
                            opts.providers.push(toProvider(RequestEncoder, strategy.encoder))
                        }

                        if (strategy.decoder) {
                            opts.providers.push(toProvider(ResponseDecoder, strategy.decoder))
                        }
                    }

                    opts.providers.push({ provide: clientOptsToken, useExisting: token });
                    return opts as ClientOpts;
                }
            }),
            {
                provide: client,
                useFactory: (injector: Injector, moduleOpts: ClientModuleOpts) => {
                    return injector.resolve(moduleOpts.clientType, [
                        { provide: moduleOpts.clientOptsToken, useExisting: token }
                    ]);
                },
                deps: [Injector, moduleOptsToken]
            }
        );

    }

    return providers;
}
