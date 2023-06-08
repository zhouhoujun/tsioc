import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, createTransportEndpoint } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { Bodyparser, Content, Json, ExecptionFinalizeFilter, LogInterceptor, ServerFinalizeFilter, Session, TransportModule, StatusVaildator } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { CoapServer } from './server/server';
import { COAP_SERV_FILTERS, COAP_MIDDLEWARES, COAP_SERV_OPTS, COAP_SERV_INTERCEPTORS, CoapServerOpts, COAP_SERV_GUARDS } from './server/options';
import { CoapEndpoint } from './server/endpoint';
import { CoapStatusVaildator } from './status';
import { CoapExecptionHandlers } from './server/execption.handles';





const defServOpts = {
    content: {
        root: 'public',
        prefix: '/content'
    },
    detailError: true,
    interceptorsToken: COAP_SERV_INTERCEPTORS,
    execptionsToken: COAP_SERV_FILTERS,
    middlewaresToken: COAP_MIDDLEWARES,
    guardsToken: COAP_SERV_GUARDS,
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ],
    backend: HybridRouter,
    interceptors: [
        Content,
        Session,
        Json,
        Bodyparser
    ]
} as CoapServerOpts;


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
export class CoapMicroServiceModule {

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
    }): ModuleWithProviders<CoapMicroServiceModule> {
        const providers: ProviderType[] = [
            { provide: COAP_SERV_OPTS, useValue: { ...defServOpts, ...options.serverOpts } }
        ];

        if (options.endpoint) {
            providers.push(toProvider(CoapEndpoint, options.endpoint))
        }

        return {
            module: CoapMicroServiceModule,
            providers
        }
    }
}

