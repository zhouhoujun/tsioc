import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST } from '@tsdi/common';
import { JsonCodingsModule } from '@tsdi/common/transport';
import { CLIENT_MODULES, ClientOpts } from '@tsdi/common/client';
import { RestfulRequestContextFactory, ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts, RequestContextFactory } from '@tsdi/endpoints';
import { Http } from './client/clinet';
import { HTTP_CLIENT_FILTERS, HTTP_CLIENT_INTERCEPTORS, HTTP_CLIENT_OPTS } from './client/options';
import { HttpHandler } from './client/handler';
import { HttpPathInterceptor } from './client/path';
import { HTTP_MIDDLEWARES, HTTP_SERV_FILTERS, HTTP_SERV_GUARDS, HTTP_SERV_INTERCEPTORS, HTTP_SERV_OPTS } from './server/options';
import { HttpEndpointHandler } from './server/handler';
import { HttpServer } from './server/server';
import { HttpClientSessionFactory, HttpServerSessionFactory } from './http.session';
import { HttpAssetContextFactory } from './server/context';
import { HttpStatusAdapter } from './status';
import { HttpExecptionHandlers } from './execption.handlers';


// const defaultMaxSize = 1048576; // 1024 * 1024;
// const defaultMaxSize = 65515; //65535 - 20;
// const defaultMaxSize = 524120; // 262060; //65515 * 4;

@Module({
    imports: [
        JsonCodingsModule
    ],
    providers: [
        Http,
        HttpServer,
        HttpStatusAdapter,
        // HttpTransportBackend,
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
                microservice: true,
                clientOptsToken: HTTP_CLIENT_OPTS,
                hanlderType: HttpHandler,
                defaultOpts: {
                    interceptorsToken: HTTP_CLIENT_INTERCEPTORS,
                    filtersToken: HTTP_CLIENT_FILTERS,
                    statusAdapter: { useExisting: HttpStatusAdapter },
                    // backend: HttpTransportBackend,
                    transportOpts: {
                        delimiter: '#'
                        // maxSize: defaultMaxSize,
                    },
                    // sessionFactory: { useExisting: HttpClientSessionFactory },
                } as ClientOpts
            },
            multi: true
        },
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
                    statusAdapter: { useExisting: HttpStatusAdapter },
                    // backend: HttpTransportBackend,
                    transportOpts: {
                        delimiter: '#',
                        // maxSize: defaultMaxSize,
                    },
                    // sessionFactory: { useExisting: HttpClientSessionFactory },
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
                handlerType: HttpEndpointHandler,
                defaultOpts: {
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        defaultMethod: '*',
                        // maxSize: defaultMaxSize
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    statusAdapter: { useExisting: HttpStatusAdapter },
                    detailError: true,
                    interceptorsToken: HTTP_SERV_INTERCEPTORS,
                    filtersToken: HTTP_SERV_FILTERS,
                    guardsToken: HTTP_SERV_GUARDS,
                    execptionHandlers: HttpExecptionHandlers,
                    // sessionFactory: { useExisting: HttpServerSessionFactory },
                    filters: [
                        LoggerInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
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
                handlerType: HttpEndpointHandler,
                defaultOpts: {
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        defaultMethod: "GET",
                        // maxSize: defaultMaxSize
                    },
                    content: {
                        root: 'public'
                    },
                    statusAdapter: { useExisting: HttpStatusAdapter },
                    detailError: true,
                    interceptorsToken: HTTP_SERV_INTERCEPTORS,
                    filtersToken: HTTP_SERV_FILTERS,
                    guardsToken: HTTP_SERV_GUARDS,
                    middlewaresToken: HTTP_MIDDLEWARES,
                    execptionHandlers: HttpExecptionHandlers,
                    // sessionFactory: { useExisting: HttpServerSessionFactory },
                    filters: [
                        LoggerInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
                    ],
                    providers: [
                        { provide: RequestContextFactory, useExisting: HttpAssetContextFactory },
                        { provide: RestfulRequestContextFactory, useExisting: HttpAssetContextFactory }
                    ]
                }
            } as ServerModuleOpts,
            multi: true
        }
    ]
})
export class HttpModule {

}
