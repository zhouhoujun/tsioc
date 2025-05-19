import { InjectFlags } from '@tsdi/ioc';
import { Bean, Configuration, ExceptionHandlerFilter } from '@tsdi/core';
import { DefaultResponseFactory, HeaderAdapter, ResponseFactory } from '@tsdi/common';
import {
    messageVaildateInterceptor, deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory,
    DeserializerFactory, FileAdapter, MimeAdapter, PacketDeserializeInterceptor,
    messageSerializeInterceptor, Redirector, SerializerFactory, StatusAdapter, StreamAdapter,
    UrlClientIncomingFactory, UrlOutgoingFactory, PayloadDeserializeInterceptor,
    UrlIncomingFactory
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    readabeRequestBodyerializeInterceptor,
    requestPacketIfySerializeInterceptor, requestSerializeBackend, requestTimeoutInterceptor, SocketClientTransport
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory, SERVER_MODULES, ServerModuleOpts, ServiceModuleOpts,
    ExceptionFinalizeFilter, FinalizeFilter, LoggerFilter,
    execptionSerializeInterceptor, contextSerializeBackend, lengthLimitSerializeInterceptor,
    ServerTransferFactory, SocketServerTransport,
    packetIfySerializeInterceptor,
    headersReadableBodyInterceptor
} from '@tsdi/endpoints';
import { CoapClient } from './client/client';
import { CoapHandler } from './client/handler';
import { COAP_CLIENT_FILTERS, COAP_CLIENT_INTERCEPTORS } from './client/options';
import { CoapServer } from './server/server';
import { CoapRequestHandler } from './server/handler';
import { COAP_MIDDLEWARES, COAP_SERV_FILTERS, COAP_SERV_GUARDS, COAP_SERV_INTERCEPTORS } from './server/options';



// const defaultMaxSize = 65515; //65535 - 20;
// const defaultMaxSize = 1048576; // 1024 * 1024;
// const defaultMaxSize = 5242880; //1024 * 1024 * 5;
// const defaultMaxSize = 10485760; //1024 * 1024 * 10;

const delimiter = Buffer.from('#');

@Configuration()
export class CoapConfiguration {

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
        option.defaultConfig!.content = {
            root: 'public',
            prefix: 'content'
        };
        // option.microservice = true;
        return option;
    }

    @Bean(SERVER_MODULES, { static: true, multi: true })
    serv(): ServiceModuleOpts {
        const option = this.getServOptions(false) as ServerModuleOpts;
        option.defaultConfig!.middlewaresToken = COAP_MIDDLEWARES,
            option.defaultConfig!.content = {
                root: 'public'
            };
        return option;
    }


    private getClientOptions(microservice: boolean): ClientModuleOpts {
        return {
            transport: 'tcp',
            clientType: CoapClient,
            microservice,
            defaultConfig: {
                handlerType: CoapHandler,
                interceptorsToken: COAP_CLIENT_INTERCEPTORS,
                filtersToken: COAP_CLIENT_FILTERS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter, streamAdapter: StreamAdapter,
                        incomingFactory: UrlClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options) => {
                                return new SocketClientTransport(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: requestSerializeBackend,
                                        ...options.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, options.deserializerConfig),
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector, options.transferConfig),
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
                interceptors: [
                    requestTimeoutInterceptor
                ]
            }
        }
    }

    private getServOptions(microservice: boolean): ServiceModuleOpts {
        return {
            transport: 'tcp',
            serverType: CoapServer,
            microservice,
            defaultConfig: {
                handlerType: CoapRequestHandler,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: UrlIncomingFactory, outgoingFactory: UrlOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        return {
                            create: (injector, socket, options) => {
                                return new SocketServerTransport(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: contextSerializeBackend,
                                        ...options.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, options.deserializerConfig),
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    fileAdapter,
                                    mimeAdapter,
                                    acceptsPriority,
                                    incomingFactory,
                                    outgoingFactory,
                                    transferFactory.create(injector, options.transferConfig),
                                    options
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
                        UrlIncomingFactory,
                        UrlOutgoingFactory,
                        DefaultServerTransferFactory
                    ]
                },
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
                detailError: false,
                interceptorsToken: COAP_SERV_INTERCEPTORS,
                filtersToken: COAP_SERV_FILTERS,
                guardsToken: COAP_SERV_GUARDS,
                filters: [
                    LoggerFilter,
                    ExceptionFinalizeFilter,
                    ExceptionHandlerFilter,
                    FinalizeFilter
                ]
            }
        }
    }

}