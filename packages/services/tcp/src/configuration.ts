import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { AbstractRequest, BaseRequest, DefaultResponseFactory, HeaderAdapter, isResponseEvent, LOCALHOST, Packet, PatternFormatter, PatternRequest, ResponseFactory, statusMessage, TopicRequest, UrlRequest } from '@tsdi/common';
import { DefaultDeserializerFactory, DefaultSerializerFactory, Deserializer, DeserializerFactory, FileAdapter, MimeAdapter, Redirector, Serializer, SerializerFactory, StatusAdapter, StreamAdapter, TransportContext, UrlClientIncomingFactory, UrlIncomingFactory, UrlOutgoingFactory } from '@tsdi/common/transport';
import { CLIENT_MODULES, ClientModuleOpts, ClientTransfer, ClientTransferFactory, DefaultClientTransferFactory, SocketClientTransport } from '@tsdi/common/client';
import {
    AcceptsPriority,
    DefaultServerTransferFactory,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor,
    RequestContext,
    SERVER_MODULES, ServerModuleOpts, ServiceModuleOpts,
    SocketServerTransport,

} from '@tsdi/endpoints';
import { TcpClient } from './client/client';
import { TcpHandler } from './client/handler';
import { TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS } from './client/options';
import { TcpRequest } from './client/request';
import { TcpServer } from './server/server';
import { TcpRequestHandler } from './server/handler';
import { TCP_MIDDLEWARES, TCP_SERV_FILTERS, TCP_SERV_GUARDS, TCP_SERV_INTERCEPTORS } from './server/options';
import { InjectFlags } from '@tsdi/ioc';
import { ServerTransfer, ServerTransferFactory } from '@tsdi/endpoints/src/transfer';
import { of } from 'rxjs';


// const defaultMaxSize = 65515; //65535 - 20;
// const defaultMaxSize = 1048576; // 1024 * 1024;
const defaultMaxSize = 5242880; //1024 * 1024 * 5;
// const defaultMaxSize = 10485760; //1024 * 1024 * 10;

@Configuration()
export class TcpConfiguration {

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
        option.defaultOpts!.middlewaresToken = TCP_MIDDLEWARES,
            option.defaultOpts!.content = {
                root: 'public'
            };
        return option;
    }


    private getClientOptions(): ClientModuleOpts {
        return {
            transport: 'tcp',
            clientType: TcpClient,
            defaultOpts: {
                handlerType: TcpHandler,
                interceptorsToken: TCP_CLIENT_INTERCEPTORS,
                filtersToken: TCP_CLIENT_FILTERS,
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
                                    'tcp',
                                    transportOptions,
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
                        DefaultResponseFactory,
                        [Redirector, InjectFlags.Optional]
                    ]
                },
                transportOptions: {
                    serializerConfig: {
                        interceptors: [                            
                            (input: any, next, context: TransportContext) => {
                                if (input instanceof AbstractRequest) {
                                    if ((input as UrlRequest).url) {
                                        return of(JSON.stringify({ headers: input.headers.getHeaders(), payload: input.body, method: (input as UrlRequest).method, url: (input as UrlRequest).getUrlWithParams() }))
                                    } else if ((input as TopicRequest).topic) {
                                        return of(JSON.stringify({ headers: input.headers.getHeaders(), payload: input.body, topic: (input as TopicRequest).topic, params: input.params }))
                                    } else if (input as PatternRequest) {
                                        return of(JSON.stringify({ headers: input.headers.getHeaders(), payload: input.body, pattern: (input as PatternRequest).pattern, params: input.params }))
                                    }
                                }
                                return next(input, context);
                            }
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [

                        ]
                    }
                },
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'tcp',
            serverType: TcpServer,
            defaultOpts: {
                handlerType: TcpRequestHandler,
                listenOpts: { port: 3000, host: LOCALHOST },
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory, formatter: PatternFormatter | null,
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
                                    transportOptions,
                                    serializerFactory.create(injector, transportOptions.serializerConfig),
                                    deserializerFactory.create(injector, transportOptions.deserializerConfig),
                                    formatter,
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
                        [PatternFormatter, InjectFlags.Optional],
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
                transportOptions: {
                    serializerConfig: {
                        interceptors: [
                            (input: any, next, context: TransportContext) => {
                                if (input instanceof RequestContext) {
                                    const reqctx = input as RequestContext;
                                    const headers = reqctx.headerAdapter.getHeaders(reqctx.response.headers);
                                    return of(JSON.stringify({ headers, payload: input.body, status: input.status, statusMessage: input.statusMessage }))
                                }
                                return next(input, context);
                            }
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [

                        ]
                    }
                },
                // transportOpts: {
                //     delimiter: '#',
                //     maxSize: defaultMaxSize,
                //     decodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof RequestContext, [[TcpIncoming, AbstractIncoming], [TcpMessage, Message]]) },
                //     encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof TcpMessage, [[UrlRequestContext, RequestContext], [PatternRequestContext, RequestContext], [TcpOutgoing, Packet]]) },
                // },
                detailError: false,
                interceptorsToken: TCP_SERV_INTERCEPTORS,
                filtersToken: TCP_SERV_FILTERS,
                guardsToken: TCP_SERV_GUARDS,
                // incomingFactory: UrlIncomingFactory,
                // outgoingFactory: UrlOutgoingFactory,
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