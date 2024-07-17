import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST } from '@tsdi/common';
import { CLIENT_MODULES, ClientModuleOpts } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts, MimeModule } from '@tsdi/endpoints';
import { Http } from './client/clinet';
import { HTTP_CLIENT_FILTERS, HTTP_CLIENT_INTERCEPTORS } from './client/options';
import { HttpHandler } from './client/handler';
import { HttpPathInterceptor } from './client/path';
import { HTTP_MIDDLEWARES, HTTP_SERV_FILTERS, HTTP_SERV_GUARDS, HTTP_SERV_INTERCEPTORS } from './server/options';
import { HttpEndpointHandler } from './server/handler';
import { HttpServer } from './server/server';
import { HttpContextFactory } from './server/context';
import { HttpStatusAdapter } from './status';
import { HttpResponseEventFactory } from './client/response.factory';
import { HttpClientCodingsHandlers } from './client/codings.hanlders';
import { HttpCodingsHandlers } from './server/codings.handlers';
import { HttpExecptionHandlers } from './execption.handlers';
import { HttpClientMessageReader, HttpClientMessageWriter } from './client/message';
import { CustomCodingsAdapter } from '@tsdi/common/codings';
import { HttpRequest, isHttpEvent } from '@tsdi/common/http';


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
        HttpCodingsHandlers,
        // HttpTransportBackend,
        HttpPathInterceptor,
        // HttpClientSessionFactory,
        // HttpServerSessionFactory,
        HttpContextFactory,
        { provide: HTTP_CLIENT_INTERCEPTORS, useExisting: HttpPathInterceptor, multi: true },
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'http',
                clientType: Http,
                microservice: true,
                hanlderType: HttpHandler,
                imports: [MimeModule],
                defaultOpts: {
                    interceptorsToken: HTTP_CLIENT_INTERCEPTORS,
                    filtersToken: HTTP_CLIENT_FILTERS,
                    statusAdapter: HttpStatusAdapter,
                    responseFactory: HttpResponseEventFactory,
                    messageReader: HttpClientMessageReader,
                    messageWriter: HttpClientMessageWriter,
                    transportOpts: {
                        encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof HttpRequest) },
                        decodingsAdapter: { useValue: new CustomCodingsAdapter(isHttpEvent, [[UdpClientIncoming, ClientIncomingPacket]]) },
                    }
                }
            } as ClientModuleOpts,
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
                    statusAdapter: HttpStatusAdapter,
                    responseFactory: HttpResponseEventFactory,
                    messageReader: HttpClientMessageReader,
                    messageWriter: HttpClientMessageWriter,
                }
            } as ClientModuleOpts,
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
                        defaultMethod: 'GET'
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    statusAdapter: HttpStatusAdapter,
                    execptionHandlers: HttpExecptionHandlers,
                    requestContextFactory: HttpContextFactory,
                    detailError: true,
                    interceptorsToken: HTTP_SERV_INTERCEPTORS,
                    filtersToken: HTTP_SERV_FILTERS,
                    guardsToken: HTTP_SERV_GUARDS,
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
                        defaultMethod: "GET"
                    },
                    content: {
                        root: 'public'
                    },
                    statusAdapter: HttpStatusAdapter,
                    execptionHandlers: HttpExecptionHandlers,
                    requestContextFactory: HttpContextFactory,
                    detailError: true,
                    interceptorsToken: HTTP_SERV_INTERCEPTORS,
                    filtersToken: HTTP_SERV_FILTERS,
                    guardsToken: HTTP_SERV_GUARDS,
                    middlewaresToken: HTTP_MIDDLEWARES,
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
