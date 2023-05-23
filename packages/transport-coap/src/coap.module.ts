import { ExecptionHandlerFilter, HybridRouter, RouterModule, TransformModule } from '@tsdi/core';
import { Module, ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import {
    BodyparserMiddleware, ContentMiddleware, CorsMiddleware, CsrfMiddleware, JsonMiddleware,
    ExecptionFinalizeFilter, HelmetMiddleware, LogInterceptor, ServerFinalizeFilter, SessionMiddleware, TransportModule
} from '@tsdi/transport';
import { CoapClient } from './client/client';
import { CoapVaildator } from './transport';
import { CoapServer } from './server/server';
import { COAP_SERV_FILTERS, COAP_MIDDLEWARES, COAP_SERVER_OPTS, COAP_SERV_INTERCEPTORS, CoapServerOpts } from './server/options';
import { COAP_FILTERS, COAP_INTERCEPTORS, CoapClientOpts } from './client/options';

@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        CoapVaildator,
        CoapClient,
        CoapServer
    ]
})
export class CoapModule {

    /**
     * CoAP Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: CoapServerOpts): ModuleWithProviders<CoapModule> {
        const providers: ProviderType[] = [{ provide: COAP_SERVER_OPTS, useValue: options }];
        return {
            module: CoapModule,
            providers
        }
    }
}


const defaults = {
    transport: {
        strategy: CoapVaildator
    },
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


const defOpts = {
    json: true,
    encoding: 'utf8',
    transport: {
        strategy: CoapVaildator
    },
    interceptorsToken: COAP_SERV_INTERCEPTORS,
    execptionsToken: COAP_SERV_FILTERS,
    middlewaresToken: COAP_MIDDLEWARES,
    interceptors: [],
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        ServerFinalizeFilter
    ],
    middlewares: [
        HelmetMiddleware,
        CorsMiddleware,
        ContentMiddleware,
        SessionMiddleware,
        CsrfMiddleware,
        JsonMiddleware,
        BodyparserMiddleware,
        HybridRouter
    ],
    serverOpts: {
        type: 'udp4'
    },
    listenOpts: {
        port: 4000,
        host: 'localhost'
    }
} as CoapServerOpts;

