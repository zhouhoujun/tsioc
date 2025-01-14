import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { DefaultResponseFactory, HeaderAdapter, isResponseEvent, LOCALHOST, Packet, PatternFormatter, ResponseFactory } from '@tsdi/common';
import { DefaultDeserializerFactory, DefaultSerializerFactory, Deserializer, DeserializerFactory, FileAdapter, MimeAdapter, Redirector, Serializer, SerializerFactory, StatusAdapter, StreamAdapter, UrlClientIncomingFactory, UrlIncomingFactory, UrlOutgoingFactory } from '@tsdi/common/transport';
import { CLIENT_MODULES, ClientModuleOpts, ClientTransfer, ClientTransferFactory, DefaultClientTransferFactory, SocketClientTransport } from '@tsdi/common/client';
import {
    AcceptsPriority,
    DefaultServerTransferFactory,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor,
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
                                return new SocketClientTransport(
                                    injector,
                                    socket,
                                    'tcp',
                                    '$',
                                    '#',
                                    '|',
                                    defaultMaxSize,
                                    2,
                                    4,
                                    'data',
                                    serializerFactory.create(injector),
                                    deserializerFactory.create(injector),
                                    formatter,
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector),
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
                }
                // incomingFactory: UrlClientIncomingFactory,
                // transportOpts: {
                //     delimiter: '#',
                //     maxSize: defaultMaxSize,
                //     encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof TcpMessage, [[TcpRequest, Packet]]) },
                //     decodingsAdapter: { useValue: new CustomCodingsAdapter(isResponseEvent, [[TcpClientIncoming, AbstractClientIncoming], [TcpMessage, Message]]) },
                // }
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
                                return new SocketServerTransport(
                                    injector,
                                    socket,
                                    'tcp',
                                    '$',
                                    '#',
                                    '|',
                                    defaultMaxSize,
                                    2,
                                    4,
                                    'data',
                                    serializerFactory.create(injector),
                                    deserializerFactory.create(injector),
                                    formatter,
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    fileAdapter,
                                    mimeAdapter,
                                    acceptsPriority,
                                    incomingFactory,
                                    outgoingFactory,
                                    transferFactory.create(injector),
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