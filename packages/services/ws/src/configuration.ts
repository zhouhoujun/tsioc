import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import {
    DeatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    FileAdapter, MimeAdapter, PacketDeserializeInterceptor, PacketifyInterceptor, PacketSerializeInterceptor,
    PacketVaildateInterceptor, PayloadDeserializeInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, UrlClientIncomingFactory, UrlOutgoingFactory
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    RequestServializeInterceptor, RequestTimeoutInterceptor, SocketClientTransport
} from '@tsdi/common/client';
import {
    AcceptsPriority,  DefaultServerTransferFactory,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor,
    RequestContextServializeInterceptor, RequestContextVaildateInterceptor, SERVER_MODULES,
    ServerTransferFactory, ServiceModuleOpts,  SocketServerTransport
} from '@tsdi/endpoints';
import { WsClient } from './client/client';
import { WS_CLIENT_FILTERS, WS_CLIENT_INTERCEPTORS } from './client/options';
import { WsHandler } from './client/handler';
import { WsServer } from './server/server';
import { WS_SERV_FILTERS, WS_SERV_GUARDS, WS_SERV_INTERCEPTORS } from './server/options';
import { WsRequestHandler } from './server/handler';
import { DefaultResponseFactory, HeaderAdapter, PatternFormatter, ResponseFactory } from '@tsdi/common';
import { InjectFlags } from '@tsdi/ioc';



// const defaultMaxSize = 65515; //1024 * 64 - 20;
// const defaultMaxSize = 1048576; //1024 * 1024;
const defaultMaxSize = 5242880; //1024 * 1024 * 5;
// const defaultMaxSize = 10485760; //1024 * 1024 * 10;

const delimiter = Buffer.from('#');

@Configuration()
export class WsConfiguration {

    @Bean(CLIENT_MODULES, { static: true, multi: true })
    microClient(): ClientModuleOpts {
        return this.getClientOptions();
    }


    @Bean(SERVER_MODULES, { static: true, multi: true })
    microServ(): ServiceModuleOpts {
        return this.getServOptions();
    }


    private getClientOptions(): ClientModuleOpts {
        return {
            transport: 'ws',
            asDefault: true,
            clientType: WsClient,
            defaultOpts: {
                handlerType: WsHandler,
                url: 'ws://localhost:3000',
                interceptorsToken: WS_CLIENT_INTERCEPTORS,
                filtersToken: WS_CLIENT_FILTERS,
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
                    delimiter,
                    serializerConfig: {
                        interceptors: [
                            PacketVaildateInterceptor,
                            PacketSerializeInterceptor,
                            RequestServializeInterceptor
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [
                            PacketifyInterceptor,
                            DeatchPacketIdInterceptor,
                            PacketDeserializeInterceptor,
                            PayloadDeserializeInterceptor
                        ]
                    }
                },
                interceptors:[
                    RequestTimeoutInterceptor
                ]
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'ws',
            asDefault: true,
            serverType: WsServer,
            defaultOpts: {
                handlerType: WsRequestHandler,
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
                content: {
                    root: 'public',
                    prefix: 'content'
                },
                transportOptions: {
                    delimiter,
                    serializerConfig: {
                        interceptors: [
                            RequestContextVaildateInterceptor,
                            PacketSerializeInterceptor,
                            RequestContextServializeInterceptor,
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [
                            PacketifyInterceptor,
                            PacketDeserializeInterceptor,
                            PayloadDeserializeInterceptor
                        ]
                    }
                },
                detailError: false,
                interceptorsToken: WS_SERV_INTERCEPTORS,
                filtersToken: WS_SERV_FILTERS,
                guardsToken: WS_SERV_GUARDS,
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
