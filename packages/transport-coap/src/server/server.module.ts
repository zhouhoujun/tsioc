import { ExecptionHandlerFilter, HybridRouter, MicroServRouterModule, RouterModule, StatusVaildator, TransformModule, createTransportEndpoint } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { Bodyparser, Content, Json, ExecptionFinalizeFilter, LogInterceptor, ServerFinalizeFilter, Session, TransportModule } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { CoapMicroService, CoapServer } from './server';
import { COAP_SERV_FILTERS, COAP_SERV_OPTS, COAP_SERV_INTERCEPTORS, CoapServerOpts, COAP_SERV_GUARDS, COAP_MICRO_SERV_OPTS, COAP_MICRO_SERV_INTERCEPTORS, COAP_MICRO_SERV_FILTERS, COAP_MICRO_SERV_GUARDS } from './options';
import { CoapEndpoint, CoapMicroEndpoint } from './endpoint';
import { CoapMicroStatusVaildator, CoapStatusVaildator } from '../status';
import { CoapExecptionHandlers } from './execption.handles';





const defMicroServOpts = {
    content: {
        root: 'public',
        prefix: 'content'
    },
    detailError: true,
    interceptorsToken: COAP_MICRO_SERV_INTERCEPTORS,
    filtersToken: COAP_MICRO_SERV_FILTERS,
    guardsToken: COAP_MICRO_SERV_GUARDS,
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ],
    backend: MicroServRouterModule.getToken('coap'),
    interceptors: [
        Session,
        Content,
        Json,
        Bodyparser
    ],
    providers: [
        { provide: StatusVaildator, useExisting: CoapMicroStatusVaildator }
    ]
} as CoapServerOpts;

/**
 * CoAP microservice Module.
 */
@Module({
    imports: [
        TransformModule,
        MicroServRouterModule.forRoot('coap'),
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        CoapMicroStatusVaildator,
        { provide: COAP_MICRO_SERV_OPTS, useValue: { ...defMicroServOpts }, asDefault: true },
        {
            provide: CoapMicroEndpoint,
            useFactory: (injector: Injector, opts: CoapServerOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, COAP_MICRO_SERV_OPTS]
        },
        CoapExecptionHandlers,
        CoapMicroService
    ]
})
export class CoapMicroServModule {

    /**
     * import CoAP micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * service endpoint provider
         */
        endpoint?: ProvdierOf<CoapMicroEndpoint>;

        /**
         * server options
         */
        serverOpts?: CoapServerOpts;
    }): ModuleWithProviders<CoapMicroServModule> {
        const providers: ProviderType[] = [
            {
                provide: COAP_SERV_OPTS,
                useValue: {
                    ...defMicroServOpts,
                    ...options.serverOpts,
                    providers: [...defMicroServOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
                }
            }
        ];

        if (options.endpoint) {
            providers.push(toProvider(CoapMicroEndpoint, options.endpoint))
        }

        return {
            module: CoapMicroServModule,
            providers
        }
    }
}




const defServOpts = {
    content: {
        root: 'public'
    },
    detailError: true,
    interceptorsToken: COAP_SERV_INTERCEPTORS,
    filtersToken: COAP_SERV_FILTERS,
    guardsToken: COAP_SERV_GUARDS,
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ],
    backend: HybridRouter,
    interceptors: [
        Session,
        Content,
        Json,
        Bodyparser
    ]
} as CoapServerOpts;

/**
 * CoAP server Module.
 */
@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        { provide: StatusVaildator, useClass: CoapStatusVaildator },
        { provide: COAP_SERV_OPTS, useValue: { ...defServOpts }, asDefault: true },
        {
            provide: CoapEndpoint,
            useFactory: (injector: Injector, opts: CoapServerOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, COAP_SERV_OPTS]
        },

        CoapExecptionHandlers,
        CoapServer
    ]
})
export class CoapServerModule {

    /**
     * import CoAP micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * service endpoint provider
         */
        endpoint?: ProvdierOf<CoapEndpoint>;
        /**
         * server options
         */
        serverOpts?: CoapServerOpts;
    }): ModuleWithProviders<CoapServerModule> {
        const providers: ProviderType[] = [
            { provide: COAP_SERV_OPTS, useValue: { ...defServOpts, ...options.serverOpts } }
        ];

        if (options.endpoint) {
            providers.push(toProvider(CoapEndpoint, options.endpoint))
        }

        return {
            module: CoapServerModule,
            providers
        }
    }
}

