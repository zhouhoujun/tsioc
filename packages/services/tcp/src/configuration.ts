import { InjectFlags } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { DefaultResponseFactory, HeaderAdapter, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    messageVaildateInterceptor, deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory,
    DeserializerFactory, FileAdapter, MimeAdapter, PacketDeserializeInterceptor, packetifyInterceptor,
    messageSerializeInterceptor, Redirector, SerializerFactory, StatusAdapter, StreamAdapter,
    UrlClientIncomingFactory, UrlOutgoingFactory, PayloadDeserializeInterceptor,
    UrlIncomingFactory
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    requestPacketIfySerializeInterceptor, requestSerializeBackend, requestTimeoutInterceptor, SocketClientTransport
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory, SERVER_MODULES, ServerModuleOpts, ServiceModuleOpts,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerFilter,
    execptionSerializeInterceptor, contextSerializeBackend, lengthLimitSerializeInterceptor,
    ServerTransferFactory, SocketServerTransport,
    packetIfySerializeInterceptor
} from '@tsdi/endpoints';
import { TcpClient } from './client/client';
import { TcpHandler } from './client/handler';
import { TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS } from './client/options';
import { TcpServer } from './server/server';
import { TcpRequestHandler } from './server/handler';
import { TCP_MIDDLEWARES, TCP_SERV_FILTERS, TCP_SERV_GUARDS, TCP_SERV_INTERCEPTORS } from './server/options';



// const defaultMaxSize = 65515; //65535 - 20;
// const defaultMaxSize = 1048576; // 1024 * 1024;
// const defaultMaxSize = 5242880; //1024 * 1024 * 5;
// const defaultMaxSize = 10485760; //1024 * 1024 * 10;

const delimiter = Buffer.from('#');

@Configuration()
export class TcpConfiguration {

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    microClient(): ClientModuleOpts {
        const options = this.getClientOptions(true);
        // options.microservice = true;
        return options;
    }

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    client(): ClientModuleOpts {
        return this.getClientOptions(false);
    }

    @Bean(SERVER_MODULES, { static: true, multi: true })
    microServ(): ServiceModuleOpts {
        const option = this.getServOptions(true);
        option.defaultOpts!.content = {
            root: 'public',
            prefix: 'content'
        };
        // option.microservice = true;
        return option;
    }

    @Bean(SERVER_MODULES, { static: true, multi: true })
    serv(): ServiceModuleOpts {
        const option = this.getServOptions(false) as ServerModuleOpts;
        option.defaultOpts!.middlewaresToken = TCP_MIDDLEWARES,
            option.defaultOpts!.content = {
                root: 'public'
            };
        return option;
    }


    private getClientOptions(microservice: boolean): ClientModuleOpts {
        return {
            transport: 'tcp',
            clientType: TcpClient,
            microservice,
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
                                    serializerFactory.create(injector, {
                                        backend: requestSerializeBackend,
                                        ...transportOptions.serializerConfig
                                    }),
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
                    delimiter,
                    serializerConfig: {
                        interceptors: [
                            messageVaildateInterceptor,
                            messageSerializeInterceptor,
                            requestPacketIfySerializeInterceptor
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [
                            packetifyInterceptor,
                            deatchPacketIdInterceptor,
                            PacketDeserializeInterceptor,
                            PayloadDeserializeInterceptor
                        ]
                    }
                },
                interceptors:[
                    requestTimeoutInterceptor
                ]
            }
        }
    }

    private getServOptions(microservice: boolean): ServiceModuleOpts {
        return {
            transport: 'tcp',
            serverType: TcpServer,
            microservice,
            defaultOpts: {
                handlerType: TcpRequestHandler,
                listenOpts: { port: 3000, host: LOCALHOST },
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: UrlIncomingFactory, outgoingFactory: UrlOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        return {
                            create: (injector, socket, options) => {
                                const transportOptions = options.transportOptions ?? {};
                                return new SocketServerTransport(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: contextSerializeBackend,
                                        ...transportOptions.serializerConfig
                                    }),
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
                        UrlIncomingFactory,
                        UrlOutgoingFactory,
                        DefaultServerTransferFactory
                    ]
                },
                transportOptions: {
                    delimiter,
                    serializerConfig: {
                        interceptors: [
                            lengthLimitSerializeInterceptor,
                            messageSerializeInterceptor,
                            packetIfySerializeInterceptor,
                            execptionSerializeInterceptor
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [
                            packetifyInterceptor,
                            PacketDeserializeInterceptor,
                            PayloadDeserializeInterceptor
                        ]
                    }
                },
                detailError: false,
                interceptorsToken: TCP_SERV_INTERCEPTORS,
                filtersToken: TCP_SERV_FILTERS,
                guardsToken: TCP_SERV_GUARDS,
                filters: [
                    LoggerFilter,
                    ExecptionFinalizeFilter,
                    ExecptionHandlerFilter,
                    FinalizeFilter
                ]
            }
        }
    }

}