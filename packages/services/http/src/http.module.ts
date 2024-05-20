import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST } from '@tsdi/common';
import { CLIENT_MODULES, ClientOpts } from '@tsdi/common/client';
import { RestfulRequestContextFactory, ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts, RequestContextFactory, MimeModule } from '@tsdi/endpoints';
import { Http } from './client/clinet';
import { HTTP_CLIENT_FILTERS, HTTP_CLIENT_INTERCEPTORS } from './client/options';
import { HttpHandler } from './client/handler';
import { HttpPathInterceptor } from './client/path';
import { HTTP_MIDDLEWARES, HTTP_SERV_FILTERS, HTTP_SERV_GUARDS, HTTP_SERV_INTERCEPTORS } from './server/options';
import { HttpEndpointHandler } from './server/handler';
import { HttpServer } from './server/server';
import { HttpAssetContextFactory } from './server/context';
import { HttpStatusAdapter } from './status';
import { HttpExecptionHandlers } from './execption.handlers';
import { HttpClientSessionFactory } from './client/client.session';
import { HttpServerSessionFactory } from './server/http.session';
import { HttpResponseEventFactory } from './client/response.factory';
import { HttpClientCodingsHandlers } from './client/codings.hanlders';
import { HttpIncomingDecodingsHandlers } from './server/decodings.handlers';
import { HttpOutgoingEncodingsHandlers } from './server/encodings.handlers';


// const defaultMaxSize = 1048576; // 1024 * 1024;
// const defaultMaxSize = 65515; //65535 - 20;
// const defaultMaxSize = 524120; // 262060; //65515 * 4;

@Module({
    providers: [
        Http,
        HttpServer,
        HttpStatusAdapter,
        HttpResponseEventFactory,
        HttpClientCodingsHandlers,
        HttpIncomingDecodingsHandlers,
        HttpOutgoingEncodingsHandlers,
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
                hanlderType: HttpHandler,
                imports: [MimeModule],
                responseEventFactory: { useExisting: HttpResponseEventFactory },
                defaultOpts: {
                    interceptorsToken: HTTP_CLIENT_INTERCEPTORS,
                    filtersToken: HTTP_CLIENT_FILTERS,
                    statusAdapter: { useExisting: HttpStatusAdapter },
                    // backend: HttpTransportBackend,
                    transportOpts: {
                        delimiter: '#'
                        // maxSize: defaultMaxSize,
                    },
                    sessionFactory: { useExisting: HttpClientSessionFactory },
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'http',
                clientType: Http,
                hanlderType: HttpHandler,
                imports: [MimeModule],
                defaultOpts: {
                    interceptorsToken: HTTP_CLIENT_INTERCEPTORS,
                    filtersToken: HTTP_CLIENT_FILTERS,
                    statusAdapter: { useExisting: HttpStatusAdapter },
                    responseEventFactory: { useExisting: HttpResponseEventFactory },
                    // backend: HttpTransportBackend,
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
                handlerType: HttpEndpointHandler,
                imports: [MimeModule],
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
                    sessionFactory: { useExisting: HttpServerSessionFactory },
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
                handlerType: HttpEndpointHandler,
                imports: [MimeModule],
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
                    sessionFactory: { useExisting: HttpServerSessionFactory },
                    filters: [
                        LoggerInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
                    ]
                }
            } as ServerModuleOpts,
            multi: true
        }
    ]
})
export class HttpModule {

}
