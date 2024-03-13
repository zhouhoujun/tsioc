import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST } from '@tsdi/common';
import { StatusVaildator } from '@tsdi/common/transport';
import { CLIENT_MODULES, ClientOpts } from '@tsdi/common/client';
import { AssetContextFactory, ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts, TransportContextFactory } from '@tsdi/endpoints';
import { Http } from './client/clinet';
import { HTTP_CLIENT_FILTERS, HTTP_CLIENT_INTERCEPTORS, HTTP_CLIENT_OPTS } from './client/options';
import { HttpHandler } from './client/handler';
import { HttpPathInterceptor } from './client/path';
import { HttpTransportBackend } from './client/backend';
import { HTTP_MIDDLEWARES, HTTP_SERV_FILTERS, HTTP_SERV_GUARDS, HTTP_SERV_INTERCEPTORS, HTTP_SERV_OPTS } from './server/options';
import { HttpEndpoint } from './server/endpoint';
import { HttpServer } from './server/server';
import { HttpClientSessionFactory, HttpServerSessionFactory } from './http.session';
import { HttpAssetContextFactory } from './server/context';
import { AssetModule, HttpStatusVaildator } from '@tsdi/endpoints/assets';


// const defaultMaxSize = 1048576; // 1024 * 1024;
// const defaultMaxSize = 65515; //65535 - 20;
// const defaultMaxSize = 524120; // 262060; //65515 * 4;

@Module({
    imports: [
        AssetModule
    ],
    providers: [
        Http,
        HttpServer,
        { provide: StatusVaildator, useExisting: HttpStatusVaildator },
        HttpTransportBackend,
        HttpPathInterceptor,
        HttpClientSessionFactory,
        HttpServerSessionFactory,
        HttpAssetContextFactory,
        { provide: HTTP_CLIENT_INTERCEPTORS, useExisting: HttpPathInterceptor, multi: true },
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'http',
                clientType: Http,
                clientOptsToken: HTTP_CLIENT_OPTS,
                hanlderType: HttpHandler,
                defaultOpts: {
                    interceptorsToken: HTTP_CLIENT_INTERCEPTORS,
                    filtersToken: HTTP_CLIENT_FILTERS,
                    backend: HttpTransportBackend,
                    transportOpts: {
                        delimiter: '#',
                        // maxSize: defaultMaxSize,
                    },
                    sessionFactory: { useExisting: HttpClientSessionFactory },
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'http',
                microservice: true,
                serverType: HttpServer,
                serverOptsToken: HTTP_SERV_OPTS,
                endpointType: HttpEndpoint,
                defaultOpts: {
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        // maxSize: defaultMaxSize
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: true,
                    interceptorsToken: HTTP_SERV_INTERCEPTORS,
                    filtersToken: HTTP_SERV_FILTERS,
                    guardsToken: HTTP_SERV_GUARDS,
                    sessionFactory: { useExisting: HttpServerSessionFactory },
                    filters: [
                        LoggerInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
                    ],
                    providers: [
                        { provide: TransportContextFactory, useExisting: HttpAssetContextFactory },
                        { provide: AssetContextFactory, useExisting: HttpAssetContextFactory }
                    ]
                }
            } as ServerModuleOpts,
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'http',
                serverType: HttpServer,
                serverOptsToken: HTTP_SERV_OPTS,
                endpointType: HttpEndpoint,
                defaultOpts: {
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        // maxSize: defaultMaxSize
                    },
                    content: {
                        root: 'public'
                    },
                    detailError: true,
                    interceptorsToken: HTTP_SERV_INTERCEPTORS,
                    filtersToken: HTTP_SERV_FILTERS,
                    guardsToken: HTTP_SERV_GUARDS,
                    middlewaresToken: HTTP_MIDDLEWARES,
                    sessionFactory: { useExisting: HttpServerSessionFactory },
                    filters: [
                        LoggerInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
                    ],
                    providers: [
                        { provide: TransportContextFactory, useExisting: HttpAssetContextFactory },
                        { provide: AssetContextFactory, useExisting: HttpAssetContextFactory }
                    ]
                }
            } as ServerModuleOpts,
            multi: true
        }
    ]
})
export class HttpModule {

}
