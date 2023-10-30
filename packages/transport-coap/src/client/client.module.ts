import { createHandler } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { TransportModule, RequestAdapter, StatusVaildator, TransportBackend, BodyContentInterceptor } from '@tsdi/transport';
import { CoapHandler } from './handler';
import { CoapClient } from './client';
import { CoapRequestAdapter } from './request';
import { COAP_CLIENT_OPTS, COAP_CLIENT_FILTERS, COAP_CLIENT_INTERCEPTORS, CoapClientOpts, CoapClientsOpts } from './options';
import { CoapStatusVaildator } from '../status';




const defClientOpts = {
    interceptorsToken: COAP_CLIENT_INTERCEPTORS,
    execptionsToken: COAP_CLIENT_FILTERS,
    interceptors: [BodyContentInterceptor],
    backend: TransportBackend,
    providers: [
        { provide: StatusVaildator, useExisting: CoapStatusVaildator },
        { provide: RequestAdapter, useExisting: CoapRequestAdapter },
    ]
} as CoapClientOpts;


@Module({
    imports: [
        TransportModule
    ],
    providers: [
        CoapStatusVaildator,
        CoapRequestAdapter,
        { provide: COAP_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        {
            provide: CoapHandler,
            useFactory: (injector: Injector, opts: CoapClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
                    Object.assign(opts, defClientOpts);
                    injector.setValue(COAP_CLIENT_OPTS, opts);
                }
                return createHandler(injector, opts);
            },
            asDefault: true,
            deps: [Injector, COAP_CLIENT_OPTS]
        },
        CoapClient
    ]
})
export class CoapClientModule {

    /**
     * import CoAP micro service client module with options.
     * @param options micro service client module options.
     * @returns 
     */
    static withOption(options: {
        /**
         * client options.
         */
        clientOpts?: CoapClientOpts | CoapClientsOpts[];
        /**
         * client handler provider
         */
        handler?: ProvdierOf<CoapHandler>;
        /**
         * custom provider with module.
         */
        providers?: ProviderType[];
    }): ModuleWithProviders<CoapClientModule> {
        const providers: ProviderType[] = [
            ...options.providers ?? EMPTY,
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(CoapClient, [{ provide: COAP_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts, providers: [...defClientOpts.providers || EMPTY, ...opts.providers || EMPTY] } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: COAP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts, providers: [...defClientOpts.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
        ];

        if (options.handler) {
            providers.push(toProvider(CoapHandler, options.handler))
        }

        return {
            module: CoapClientModule,
            providers
        }
    }
}
