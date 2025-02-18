import { InjectFlags, isString, promisify } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import {
    deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    FileAdapter, MimeAdapter, PacketDeserializeInterceptor, messageSerializeInterceptor,
    messageVaildateInterceptor, PayloadDeserializeInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, UrlClientIncomingFactory, UrlOutgoingFactory,
    ev,
    NotSupportedExecption,
    isBuffer
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport,
    requestPacketIfySerializeInterceptor,
    requestSerializeBackend, requestTimeoutInterceptor
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerFilter,
    contextSerializeBackend, lengthLimitSerializeInterceptor, SERVER_MODULES,
    ServerTransferFactory, ServiceModuleOpts,
    execptionSerializeInterceptor,
    packetIfySerializeInterceptor,
    DefaultServerTransport
} from '@tsdi/endpoints';
import { WsClient } from './client/client';
import { WS_CLIENT_FILTERS, WS_CLIENT_INTERCEPTORS, WsClientOpts } from './client/options';
import { WsHandler } from './client/handler';
import { WsServer } from './server/server';
import { WS_SERV_FILTERS, WS_SERV_GUARDS, WS_SERV_INTERCEPTORS, WsServerOpts } from './server/options';
import { WsRequestHandler } from './server/handler';
import { DefaultResponseFactory, HeaderAdapter, PatternFormatter, ResponseFactory } from '@tsdi/common';
import { fromEvent } from 'rxjs';




const sizeLimit = 10485760; //1024 * 1024 * 10;

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
                connectOpts: {
                    maxPayload: sizeLimit
                },
                interceptorsToken: WS_CLIENT_INTERCEPTORS,
                filtersToken: WS_CLIENT_FILTERS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory, formatter: PatternFormatter | null,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        incomingFactory: UrlClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options: WsClientOpts) => {
                                options.transportOptions = options.enableStream ? options.streamTransport?.transportOptions : options.transportOptions;

                                return new DefaultClientTransport(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: requestSerializeBackend,
                                        ...(options.enableStream ? options.streamTransport?.serializerConfig : options.serializerConfig)
                                    }),
                                    deserializerFactory.create(injector, options.enableStream ? options.streamTransport?.deserializerConfig : options.deserializerConfig),
                                    formatter,
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector, options.enableStream ? options.streamTransport?.transferConfig : options.transferConfig),
                                    responseFactory,
                                    redirector,
                                    options,
                                    (socket, req, context) => fromEvent(socket, options.enableStream ? ev.DATA : ev.MESSAGE, (payload: any) => {
                                        return isString(payload) || isBuffer(payload) ? payload : payload.data
                                    }),
                                    async (socket, msg, req) => {
                                        const payload = msg.payload ?? msg;
                                        if (streamAdapter.isReadable(payload)) {
                                            if (!options.enableStream) throw new NotSupportedExecption('Not supported stream payload');
                                            return streamAdapter.pipeTo(payload, socket, { end: false });
                                        }
                                        return promisify<any, void>(options.enableStream ? socket.write : socket.send, socket)(payload)
                                    }
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
                serializerConfig: {
                    interceptors: [
                        messageVaildateInterceptor
                    ]
                },
                deserializerConfig: {
                    interceptors: [
                        deatchPacketIdInterceptor,
                    ]
                },
                transportOptions: {
                    limit: sizeLimit
                },
                streamTransport: {
                    serializerConfig: {
                        interceptors: [
                            messageVaildateInterceptor,
                            messageSerializeInterceptor,
                            requestPacketIfySerializeInterceptor
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [
                            deatchPacketIdInterceptor,
                            PacketDeserializeInterceptor,
                            PayloadDeserializeInterceptor
                        ]
                    },
                    transportOptions: {
                        delimiter
                    },
                },
                interceptors: [
                    requestTimeoutInterceptor
                ]
            } as WsClientOpts
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
                            create: (injector, socket, options: WsServerOpts) => {
                                options.transportOptions = options.enableStream ? options.streamTransport?.transportOptions : options.transportOptions;
                                return new DefaultServerTransport(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: contextSerializeBackend,
                                        ...(options.enableStream ? options.streamTransport?.serializerConfig : options.serializerConfig)
                                    }),
                                    deserializerFactory.create(injector, options.enableStream ? options.streamTransport?.deserializerConfig : options.deserializerConfig),
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    fileAdapter,
                                    mimeAdapter,
                                    acceptsPriority,
                                    incomingFactory,
                                    outgoingFactory,
                                    transferFactory.create(injector, options.enableStream ? options.streamTransport?.transferConfig : options.transferConfig),
                                    options,
                                    (socket, context) => fromEvent(socket, options.enableStream ? ev.DATA : ev.MESSAGE, (payload: any) => {
                                        return isString(payload) || isBuffer(payload) ? payload : payload.data
                                    }),
                                    async (socket, msg, requestContext) => {
                                        const payload = msg.payload ?? msg;
                                        if (streamAdapter.isReadable(payload)) {
                                            if (!options.enableStream) throw new NotSupportedExecption('Not supported stream payload');
                                            return streamAdapter.pipeTo(payload, socket, { end: false });
                                        }
                                        return promisify<any, void>(options.enableStream ? socket.write : socket.send, socket)(payload)
                                    }
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
                serializerConfig: {
                    interceptors: [
                        lengthLimitSerializeInterceptor,
                        execptionSerializeInterceptor
                    ]
                },
                deserializerConfig: {},
                transportOptions: {
                    limit: sizeLimit
                },
                streamTransport: {
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
                            PacketDeserializeInterceptor,
                            PayloadDeserializeInterceptor
                        ]
                    },
                    transportOptions: {
                        delimiter
                    },
                },
                serverOpts: {
                    maxPayload: sizeLimit
                },
                content: {
                    root: 'public',
                    prefix: 'content'
                },
                detailError: false,
                interceptorsToken: WS_SERV_INTERCEPTORS,
                filtersToken: WS_SERV_FILTERS,
                guardsToken: WS_SERV_GUARDS,
                filters: [
                    LoggerFilter,
                    ExecptionFinalizeFilter,
                    ExecptionHandlerFilter,
                    FinalizeFilter
                ]
            } as WsServerOpts
        }
    }
}
