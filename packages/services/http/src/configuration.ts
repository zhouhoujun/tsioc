import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { HeaderAdapter, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import { AbstractClientIncoming, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory, FileAdapter, MimeAdapter, Redirector, SerializerFactory, StatusAdapter, StreamAdapter, UrlClientIncomingFactory, UrlOutgoingFactory } from '@tsdi/common/transport';
import { CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory, SocketClientTransport, UrlRedirector } from '@tsdi/common/client';
import { isHttpEvent } from '@tsdi/common/http';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts, MimeModule, ServiceModuleOpts, JsonInterceptor, BodyparserInterceptor, AcceptsPriority, ServerTransferFactory, SocketServerTransport, DefaultServerTransferFactory } from '@tsdi/endpoints';
import { ClientHttp2Stream } from 'http2';
import { Http } from './client/clinet';
import { HTTP_CLIENT_FILTERS, HTTP_CLIENT_INTERCEPTORS } from './client/options';
import { HttpHandler } from './client/handler';
import { HTTP_MIDDLEWARES, HTTP_SERV_FILTERS, HTTP_SERV_GUARDS, HTTP_SERV_INTERCEPTORS } from './server/options';
import { HttpRequestHandler } from './server/handler';
import { HttpServer } from './server/server';
// import { HttpContext, HttpContextFactory } from './server/context';
import { HttpStatusAdapter } from './status';
import { HttpResponseEventFactory } from './client/response.factory';
import { HttpExecptionHandlers } from './execption.handlers';
// import { HttpClientIncoming, HttpClientIncomingFactory, HttpClientMessageReader, HttpClientMessageWriter } from './client/transport';
import { InjectFlags } from '@tsdi/ioc';
// import { HttpIncomingFactory, HttpServerMessageReader, HttpServerMessagerWriter } from './server/transport';
// import { HttpMesage, HttpMesageFactory } from './message';


@Configuration()
export class HttpConfiguration {

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    microClient(): ClientModuleOpts {
        const options = this.getClientOptions();
        return options;
    }

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    client(): ClientModuleOpts {
        return this.getClientOptions();
    }


    @Bean(SERVER_MODULES, { static: true, multi: true })
    serv(): ServiceModuleOpts {
        const option = this.getServOptions() as ServerModuleOpts;
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
            imports: [
                MimeModule,
            ],
            defaultOpts: {
                handlerType: HttpHandler,
                interceptorsToken: HTTP_CLIENT_INTERCEPTORS,
                filtersToken: HTTP_CLIENT_FILTERS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory, formatter: PatternFormatter | null,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        incomingFactory: UrlClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options) => {
                                const transportOptions = options.transportOptions ?? {};
                                return new SocketClientTransport(
                                    injector,
                                    socket,
                                    'http',
                                    serializerFactory.create(injector, transportOptions.serializerConfig),
                                    deserializerFactory.create(injector, transportOptions.deserializerConfig),
                                    formatter,
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector, transportOptions.transferConfig),
                                    responseFactory,
                                    redirector,
                                    options
                                )
                            },
                        }
                    },
                    deps: [
                        DefaultSerializerFactory,
                        DefaultDeserializerFactory,
                        [PatternFormatter, InjectFlags.Optional],
                        [StatusAdapter, InjectFlags.Optional],
                        [HeaderAdapter, InjectFlags.Optional],
                        StreamAdapter,
                        UrlClientIncomingFactory,
                        DefaultClientTransferFactory,
                        HttpResponseEventFactory,
                        [UrlRedirector, InjectFlags.Optional]
                    ]
                },
                // statusAdapter: HttpStatusAdapter,
                // incomingFactory: HttpClientIncomingFactory,
                // responseFactory: HttpResponseEventFactory,
                // messageFactory: HttpMesageFactory,
                // messageReader: HttpClientMessageReader,
                // messageWriter: HttpClientMessageWriter,
                // providers: [{ provide: Redirector, useExisting: UrlRedirector }],
                // transportOpts: {
                //     encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof HttpMesage) },
                //     decodingsAdapter: { useValue: new CustomCodingsAdapter(isHttpEvent, [[HttpClientIncoming, AbstractClientIncoming]]) },
                //     close: async (socket: ClientHttp2Stream) => {
                //         return socket.destroy()
                //     },
                // }
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'http',
            serverType: HttpServer,
            imports: [
                MimeModule
            ],
            defaultOpts: {
                handlerType: HttpRequestHandler,
                listenOpts: { port: 3000, host: LOCALHOST },
                // transportOpts: {
                //     defaultMethod: 'GET',
                //     decodingsAdapter: { useValue: new CustomCodingsAdapter(r => r instanceof HttpContext) },
                //     encodingsAdapter: { useValue: new CustomCodingsAdapter(d => d instanceof HttpMesage) }
                // },
                // statusAdapter: HttpStatusAdapter,
                // incomingFactory: HttpIncomingFactory,
                // requestContextFactory: HttpContextFactory,
                // messageFactory: HttpMesageFactory,
                // messageReader: HttpServerMessageReader,
                // messageWriter: HttpServerMessagerWriter,
                execptionHandlers: HttpExecptionHandlers,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: UrlClientIncomingFactory, outgoingFactory: UrlOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        return {
                            create: (injector, socket, options) => {
                                const transportOptions = options.transportOptions ?? {};
                                return new SocketServerTransport(
                                    injector,
                                    socket,
                                    'tcp',
                                    serializerFactory.create(injector, transportOptions.serializerConfig),
                                    deserializerFactory.create(injector, transportOptions.deserializerConfig),
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    fileAdapter,
                                    mimeAdapter,
                                    acceptsPriority,
                                    incomingFactory,
                                    outgoingFactory,
                                    transferFactory.create(injector, transportOptions.transferConfig),
                                    options
                                )
                            },
                        }
                    },
                    deps: [
                        DefaultSerializerFactory,
                        DefaultDeserializerFactory,
                        [StatusAdapter, InjectFlags.Optional],
                        [HeaderAdapter, InjectFlags.Optional],
                        StreamAdapter,
                        FileAdapter,
                        [MimeAdapter, InjectFlags.Optional],
                        [AcceptsPriority, InjectFlags.Optional],
                        UrlClientIncomingFactory,
                        UrlOutgoingFactory,
                        DefaultServerTransferFactory
                    ]
                },

                detailError: true,
                interceptorsToken: HTTP_SERV_INTERCEPTORS,
                filtersToken: HTTP_SERV_FILTERS,
                guardsToken: HTTP_SERV_GUARDS,
                filters: [
                    LoggerInterceptor,
                    ExecptionFinalizeFilter,
                    ExecptionHandlerFilter,
                    FinalizeFilter
                ],
                interceptors: [
                    JsonInterceptor,
                    BodyparserInterceptor
                ]
            }
        }
    }

}