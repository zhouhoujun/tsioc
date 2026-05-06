import { InjectFlags, isString, promisify } from '@tsdi/ioc';
import { Bean, Configuration, ExceptionHandlerFilter } from '@tsdi/core';
import { DefaultResponseFactory, HeaderAdapter, ResponseFactory } from '@tsdi/common';
import {
    deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    FileAdapter, MimeAdapter, PacketDeserializeInterceptor, messageSerializeInterceptor,
    messageVaildateInterceptor, PayloadDeserializeInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, UrlClientIncomingFactory, UrlOutgoingFactory, ev, NotSupportedException, isBuffer
} from '@tsdi/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport,
    readabeRequestBodyerializeInterceptor,
    requestPacketIfySerializeInterceptor,
    requestSerializeBackend, requestTimeoutInterceptor
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory,
    ExceptionFinalizeFilter, FinalizeFilter, LoggerFilter,
    contextSerializeBackend, lengthLimitSerializeInterceptor, SERVER_MODULES,
    ServerTransferFactory, ServiceModuleOpts,
    execptionSerializeInterceptor,
    packetIfySerializeInterceptor,
    DefaultServerTransport,
    headersReadableBodyInterceptor
} from '@tsdi/endpoints';
import { fromEvent } from 'rxjs';
import { WsClient } from './client/client';
import { WS_CLIENT_FILTERS, WS_CLIENT_INTERCEPTORS, WsClientConfig } from './client/options';
import { WsHandler } from './client/handler';
import { WsServer } from './server/server';
import { WS_SERV_FILTERS, WS_SERV_GUARDS, WS_SERV_INTERCEPTORS, WsServConfig } from './server/options';
import { WsRequestHandler } from './server/handler';




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
            defaultConfig: {
                handlerType: WsHandler,
                url: 'ws://localhost:3000',
                connectOpts: {
                    maxPayload: sizeLimit
                },
                interceptorsToken: WS_CLIENT_INTERCEPTORS,
                filtersToken: WS_CLIENT_FILTERS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter, streamAdapter: StreamAdapter,
                        incomingFactory: UrlClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options: WsClientConfig) => {
                                options.transportOptions = options.enableStream ? options.streamTransport?.transportOptions : options.transportOptions;

                                return new DefaultClientTransport(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: requestSerializeBackend,
                                        ...(options.enableStream ? options.streamTransport?.serializerConfig : options.serializerConfig)
                                    }),
                                    deserializerFactory.create(injector, options.enableStream ? options.streamTransport?.deserializerConfig : options.deserializerConfig),
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector, options.enableStream ? options.streamTransport?.transferConfig : options.transferConfig),
                                    responseFactory,
                                    redirector,
                                    options,
                                    (socket, factory, context) => fromEvent(socket, options.enableStream ? ev.DATA : ev.MESSAGE, (payload: any) => {
                                        return isString(payload) || isBuffer(payload) ? payload : payload.data;
                                    }),
                                    async (socket, msg, req) => {
                                        const payload = msg.payload ?? msg;
                                        if (streamAdapter.isReadable(payload)) {
                                            if (!options.enableStream) throw new NotSupportedException('Not supported stream payload');
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
                        HeaderAdapter,
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
                            requestPacketIfySerializeInterceptor,
                            readabeRequestBodyerializeInterceptor
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
            } as WsClientConfig
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'ws',
            asDefault: true,
            serverType: WsServer,
            defaultConfig: {
                handlerType: WsRequestHandler,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: UrlClientIncomingFactory, outgoingFactory: UrlOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        return {
                            create: (injector, socket, options: WsServConfig) => {
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
                                    (socket, factory, context) => fromEvent(socket, options.enableStream ? ev.DATA : ev.MESSAGE, (payload: any) => {
                                        return isString(payload) || isBuffer(payload) ? payload : payload.data;
                                    }),
                                    async (socket, msg, requestContext) => {
                                        const payload = msg.payload ?? msg;
                                        if (streamAdapter.isReadable(payload)) {
                                            if (!options.enableStream) throw new NotSupportedException('Not supported stream payload');
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
                        HeaderAdapter,
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
                            execptionSerializeInterceptor,
                            headersReadableBodyInterceptor
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
                    ExceptionFinalizeFilter,
                    ExceptionHandlerFilter,
                    FinalizeFilter
                ]
            } as WsServConfig
        }
    }
}
