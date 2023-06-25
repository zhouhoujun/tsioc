import { StatusVaildator, createHandler } from '@tsdi/core';
import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, isArray, toProvider } from '@tsdi/ioc';
import { BodyContentInterceptor, HttpStatusVaildator, StreamRequestAdapter, TransportModule, StreamTransportBackend } from '@tsdi/transport';
import { ServerTransportModule } from '@tsdi/platform-server-transport';
import { HTTP_CLIENT_FILTERS, HTTP_CLIENT_INTERCEPTORS, HTTP_CLIENT_OPTS, HttpClientOpts, HttpClientsOpts } from './option';
import { Http } from './clinet';
import { HttpHandler } from './handler';
import { HttpPathInterceptor } from './path';
import { HttpRequestAdapter } from './request';


const defClientOpts = {
    interceptorsToken: HTTP_CLIENT_INTERCEPTORS,
    interceptors: [HttpPathInterceptor, BodyContentInterceptor],
    filtersToken: HTTP_CLIENT_FILTERS,
    backend: StreamTransportBackend,
    providers: [
        { provide: StreamRequestAdapter, useExisting: HttpRequestAdapter },
        { provide: StatusVaildator, useExisting: HttpStatusVaildator }
    ]

} as HttpClientOpts;

/**
 * http client module for 'nodejs'.
 */
@Module({
    imports: [
        TransportModule,
        ServerTransportModule
    ],
    providers: [
        HttpStatusVaildator,
        HttpRequestAdapter,
        HttpPathInterceptor,
        { provide: HTTP_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
        {
            provide: HttpHandler,
            useFactory: (injector: Injector, opts: HttpClientOpts) => {
                if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
                    Object.assign(opts, defClientOpts);
                    injector.setValue(HTTP_CLIENT_OPTS, opts);
                }
                return createHandler(injector, opts)
            },
            asDefault: true,
            deps: [Injector, HTTP_CLIENT_OPTS]
        },
        Http,

    ]
})
export class HttpModule {

    static withOption(options: {
        /**
         * client options.
         */
        clientOpts?: HttpClientOpts | HttpClientsOpts[];
        /**
         * client handler provider
         */
        handler?: ProvdierOf<HttpHandler>;
    }): ModuleWithProviders<HttpModule> {
        const providers: ProviderType[] = [
            ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
                provide: opts.client,
                useFactory: (injector: Injector) => {
                    return injector.resolve(Http, [{ provide: HTTP_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts, providers: [...defClientOpts.providers || EMPTY, ...opts.providers || EMPTY] } }]);
                },
                deps: [Injector]
            }))
                : [{ provide: HTTP_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts, providers: [...defClientOpts.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }],
        ];

        if (options.handler) {
            providers.push(toProvider(HttpHandler, options.handler))
        }

        return {
            module: HttpModule,
            providers
        }
    }
}


