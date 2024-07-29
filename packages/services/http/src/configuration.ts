import { Module } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST } from '@tsdi/common';
import { CustomCodingsAdapter } from '@tsdi/common/codings';
import { ClientIncomingPacket } from '@tsdi/common/transport';
import { CLIENT_MODULES, ClientModuleOpts } from '@tsdi/common/client';
import { HttpRequest, isHttpEvent } from '@tsdi/common/http';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts, MimeModule, ServiceModuleOpts } from '@tsdi/endpoints';
import { Http } from './client/clinet';
import { HTTP_CLIENT_FILTERS, HTTP_CLIENT_INTERCEPTORS } from './client/options';
import { HttpHandler } from './client/handler';
import { HttpPathInterceptor } from './client/path';
import { HTTP_MIDDLEWARES, HTTP_SERV_FILTERS, HTTP_SERV_GUARDS, HTTP_SERV_INTERCEPTORS } from './server/options';
import { HttpRequestHandler } from './server/handler';
import { HttpServer } from './server/server';
import { HttpContext, HttpContextFactory } from './server/context';
import { HttpStatusAdapter } from './status';
import { HttpResponseEventFactory } from './client/response.factory';
import { HttpClientCodingsHandlers } from './client/codings.hanlders';
import { HttpCodingsHandlers } from './server/codings.handlers';
import { HttpExecptionHandlers } from './execption.handlers';
import { HttpClientIncoming, HttpClientMessageReader, HttpClientMessageWriter } from './client/message';


@Configuration()
export class HttpConfiguration {

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    microClient(): ClientModuleOpts {
        const options = this.getClientOptions();
        options.microservice = true;
        return options;
    }

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    client(): ClientModuleOpts {
        return this.getClientOptions();
    }

    @Bean(SERVER_MODULES, { static: true, multi: true })
    microServ(): ServiceModuleOpts {
        const option = this.getServOptions();
        option.defaultOpts!.transportOpts!.defaultMethod = '*';
        option.defaultOpts!.content = {
            root: 'public',
            prefix: 'content'
        };
        option.microservice = true;
        return option;
    }

    @Bean(SERVER_MODULES, { static: true, multi: true })
    serv(): ServiceModuleOpts {
        const option = this.getServOptions() as ServerModuleOpts;
        option.defaultOpts!.transportOpts!.defaultMethod = 'GET';
        option.defaultOpts!.middlewaresToken = HTTP_MIDDLEWARES,
            option.defaultOpts!.content = {
                root: 'public'
            };
        return option;
    }


    private getClientOptions(): ClientModuleOpts {
        return {
            transport: 'http',
            clientType: Http,
            imports: [MimeModule],
            defaultOpts: {
                handlerType: HttpHandler,
                interceptorsToken: HTTP_CLIENT_INTERCEPTORS,
                filtersToken: HTTP_CLIENT_FILTERS,
                statusAdapter: HttpStatusAdapter,
                responseFactory: HttpResponseEventFactory,
                messageReader: HttpClientMessageReader,
                messageWriter: HttpClientMessageWriter,
                transportOpts: {
                    encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof HttpRequest) },
                    decodingsAdapter: { useValue: new CustomCodingsAdapter(isHttpEvent, [[HttpClientIncoming, ClientIncomingPacket]]) },
                }
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'http',
            serverType: HttpServer,
            imports: [MimeModule],
            defaultOpts: {
                handlerType: HttpRequestHandler,
                listenOpts: { port: 3000, host: LOCALHOST },
                transportOpts: {
                    defaultMethod: 'GET',
                    decodingsAdapter: { useValue: new CustomCodingsAdapter(r => r instanceof HttpContext) },
                    encodingsAdapter: { useValue: new CustomCodingsAdapter(d => d) }
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
        }
    }

}