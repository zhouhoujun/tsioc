import { InjectFlags } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { DefaultResponseFactory, HeaderAdapter, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    DeatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    FileAdapter, MimeAdapter, PacketDeserializeInterceptor, PacketifyInterceptor, PacketSerializeInterceptor,
    PacketVaildateInterceptor, PayloadDeserializeInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, TopicClientIncomingFactory, TopicOutgoingFactory
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    RequestServializeInterceptor, SocketClientTransport
} from '@tsdi/common/client';
import {
    AcceptsPriority,
    DefaultServerTransferFactory,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, PatternRequestContext,
    RequestContext, RequestContextServializeInterceptor, RequestContextVaildateInterceptor,
    SERVER_MODULES, ServerTransferFactory, ServiceModuleOpts,
    SocketServerTransport
} from '@tsdi/endpoints';
import { MqttClient } from './client/client';
import { MQTT_CLIENT_FILTERS, MQTT_CLIENT_INTERCEPTORS } from './client/options';
import { MqttHandler } from './client/handler';
import { MqttServer } from './server/server';
import { MQTT_SERV_FILTERS, MQTT_SERV_GUARDS, MQTT_SERV_INTERCEPTORS } from './server/options';
import { MqttRequestHandler } from './server/handler';
import { MqttMessage, MqttMessageFactory } from './message';
import { MqttRequest } from './client/request';
import { MqttClientIncoming, MqttClientIncomingFactory } from './client/transport';
import { MqttIncoming, MqttIncomingFactory, MqttOutgoing, MqttOutgoingFactory } from './server/transport';



const sizeLimit = 1048576; // 1024 * 1024;
// const defaultMaxSize = 524288; //1024 * 512;



@Configuration()
export class MqttConfiguration {

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
            transport: 'mqtt',
            microservice: true,
            asDefault: true,
            clientType: MqttClient,
            defaultOpts: {
                handlerType: MqttHandler,
                url: 'mqtt://localhost:1883',
                interceptorsToken: MQTT_CLIENT_INTERCEPTORS,
                filtersToken: MQTT_CLIENT_FILTERS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory, formatter: PatternFormatter | null,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        incomingFactory: TopicClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options) => {
                                const transportOptions = options.transportOptions ?? {};
                                return new SocketClientTransport(
                                    injector,
                                    socket,
                                    'mqtt',
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
                        TopicClientIncomingFactory,
                        DefaultClientTransferFactory,
                        DefaultResponseFactory,
                        [Redirector, InjectFlags.Optional]
                    ]
                },
                transportOptions: {
                    // delimiter: '#',
                    limit: sizeLimit,
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
                }
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'mqtt',
            microservice: true,
            asDefault: true,
            serverType: MqttServer,
            defaultOpts: {
                handlerType: MqttRequestHandler,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: TopicClientIncomingFactory, outgoingFactory: TopicOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        return {
                            create: (injector, socket, options) => {
                                const transportOptions = options.transportOptions ?? {};
                                return new SocketServerTransport(
                                    injector,
                                    socket,
                                    'mqtt',
                                    transportOptions,
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
                        TopicClientIncomingFactory,
                        TopicOutgoingFactory,
                        DefaultServerTransferFactory
                    ]
                },
                transportOptions: {
                    // delimiter: '#',
                    // defaultMethod: '*',
                    limit: sizeLimit,
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
                content: {
                    root: 'public',
                    prefix: 'content'
                },
                serverOpts: {
                    host: LOCALHOST,
                    port: 1883
                },

                detailError: false,
                interceptorsToken: MQTT_SERV_INTERCEPTORS,
                filtersToken: MQTT_SERV_FILTERS,
                guardsToken: MQTT_SERV_GUARDS,
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