import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule, createHandler, createTransportEndpoint } from '@tsdi/core';
import { Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import {
    Bodyparser, Content, Json, ExecptionFinalizeFilter, LogInterceptor, ServerFinalizeFilter, Session, TransportModule
} from '@tsdi/transport';
import { CoapClient } from './client/client';
import { CoapServer } from './server/server';
import { COAP_SERV_FILTERS, COAP_MIDDLEWARES, COAP_SERV_OPTS, COAP_SERV_INTERCEPTORS, CoapServerOpts } from './server/options';
import { COAP_CLIENT_OPTS, COAP_FILTERS, COAP_INTERCEPTORS, CoapClientOpts, CoapClientsOpts } from './client/options';
import { CoapHandler } from './client/handler';
import { CoapEndpoint } from './server/endpoint';

@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        CoapClient,
        CoapServer
    ]
})
export class CoapModule {

    /**
     * import CoAP mirco service module with options.
     * @param options mirco service module options.
     * @returns 
     */
    static forMicroService(options: CoapModuleOptions): ModuleWithProviders<CoapModule> {
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(CoapClient, [{ provide: COAP_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: COAP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts } }],
            { provide: COAP_SERV_OPTS, useValue: { ...defServOpts, ...options.serverOpts } },
            toProvider(CoapHandler, options.handler ?? {
                useFactory: (injector: Injector, opts: CoapClientOpts) => {
                    if (!opts.interceptors) {
                        Object.assign(opts, defClientOpts);
                        injector.setValue(COAP_CLIENT_OPTS, opts);
                    }
                    return createHandler(injector, opts);
                },
                deps: [Injector, COAP_CLIENT_OPTS]
            }),
            toProvider(CoapEndpoint, options.endpoint ?? {
                useFactory: (injector: Injector, opts: CoapServerOpts) => {
                    return createTransportEndpoint(injector, opts)
                },
                deps: [Injector, COAP_SERV_OPTS]
            })
        ];

        return {
            module: CoapModule,
            providers
        }
    }
}



/**
 * tcp mirco service module options.
 */
export interface CoapModuleOptions {
    /**
     * client options.
     */
    clientOpts?: CoapClientOpts | CoapClientsOpts[];
    /**
     * client handler provider
     */
    handler?: ProvdierOf<CoapHandler>;
    /**
     * service endpoint provider
     */
    endpoint?: ProvdierOf<CoapEndpoint>;

    /**
     * server options
     */
    serverOpts?: CoapServerOpts;
}

const defClientOpts = {
    interceptorsToken: COAP_INTERCEPTORS,
    execptionsToken: COAP_FILTERS,
    address: {
        port: 3000,
        hostname: 'localhost'
    },
    connectOpts: {
        type: 'udp4'
    }
} as CoapClientOpts;


const defServOpts = {
    interceptorsToken: COAP_SERV_INTERCEPTORS,
    execptionsToken: COAP_SERV_FILTERS,
    middlewaresToken: COAP_MIDDLEWARES,
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

