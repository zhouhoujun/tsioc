import { InjectFlags, promisify } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { DefaultResponseFactory, HeaderAdapter, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    ev, FileAdapter, MimeAdapter, NotSupportedExecption, packetifyInterceptor,
    messageVaildateInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, TopicClientIncomingFactory, TopicOutgoingFactory
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport, requestPacketIfySerializeInterceptor, requestSerializeBackend, requestTimeoutInterceptor
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory, DefaultServerTransport,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerFilter, execptionSerializeInterceptor,
    lengthLimitSerializeInterceptor, packetIfySerializeInterceptor, contextSerializeBackend,
    SERVER_MODULES, ServerTransferFactory, ServiceModuleOpts,
    TopicRequestContext
} from '@tsdi/endpoints';
import * as mqtt from 'mqtt';
import { filter, fromEvent } from 'rxjs';
import { MqttClient } from './client/client';
import { MQTT_CLIENT_FILTERS, MQTT_CLIENT_INTERCEPTORS } from './client/options';
import { MqttHandler } from './client/handler';
import { MqttServer } from './server/server';
import { MQTT_SERV_FILTERS, MQTT_SERV_GUARDS, MQTT_SERV_INTERCEPTORS } from './server/options';
import { MqttRequestHandler } from './server/handler';
import { MqttRequest } from './client/request';



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
                                const subscribes = new Set<string>();
                                return new DefaultClientTransport<mqtt.Client, MqttRequest<any>>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: requestSerializeBackend,
                                        ...transportOptions.serializerConfig
                                    }),deserializerFactory.create(injector, transportOptions.deserializerConfig),
                                    formatter,
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector, transportOptions.transferConfig),
                                    responseFactory,
                                    redirector,
                                    options,
                                    (mqtt, req, context) => fromEvent(mqtt, ev.MESSAGE, (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => {
                                        return { topic, payload }
                                    }).pipe(filter(msg => msg.topic === req.responseTopic)),
                                    async (mqtt, msg, req) => {
                                        if (req.responseTopic && !subscribes.has(req.responseTopic)) {
                                            subscribes.add(req.responseTopic);
                                            await promisify(mqtt.subscribe, mqtt)(req.responseTopic);
                                        }
                                        if (streamAdapter.isReadable(msg.payload)) throw new NotSupportedExecption('Not supported stream payload');
                                        return await promisify<string, Buffer | string, mqtt.IClientPublishOptions>(mqtt.publish, mqtt)(req.topic, msg.payload ?? Buffer.alloc(0), { qos: 1 })
                                    },
                                    async (mqtt) => {
                                        if (subscribes.size) {
                                            await promisify(mqtt.unsubscribe, mqtt)(Array.from(subscribes.values()))
                                        }
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
                        TopicClientIncomingFactory,
                        DefaultClientTransferFactory,
                        DefaultResponseFactory,
                        [Redirector, InjectFlags.Optional]
                    ]
                },
                transportOptions: {
                    limit: sizeLimit,
                    serializerConfig: {
                        interceptors: [
                            messageVaildateInterceptor,
                            requestPacketIfySerializeInterceptor
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [
                            packetifyInterceptor,
                            deatchPacketIdInterceptor
                        ]
                    }
                },
                interceptors: [
                    requestTimeoutInterceptor
                ]
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'mqtt',
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
                                return new DefaultServerTransport<mqtt.Client, TopicRequestContext>(
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
                                    options,
                                    (mqtt) => fromEvent(mqtt, ev.MESSAGE, (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => {
                                        return { topic, responseTopic: packet.properties?.responseTopic, payload }
                                    }).pipe(
                                        filter(m => !!m.responseTopic || !m.topic.endsWith('/reply'))
                                    ),
                                    (mqtt, msg, requestContext) => {
                                        if (streamAdapter.isReadable(msg.payload)) throw new NotSupportedExecption('Not supported stream payload');
                                        if (!requestContext.responseTopic) throw new NotSupportedExecption('Not need response');
                                        return promisify<string, Buffer | string, mqtt.IClientPublishOptions>(mqtt.publish, mqtt)(requestContext.responseTopic, msg.payload ?? Buffer.alloc(0), { qos: 1 })
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
                        TopicClientIncomingFactory,
                        TopicOutgoingFactory,
                        DefaultServerTransferFactory
                    ]
                },
                transportOptions: {
                    limit: sizeLimit,
                    serializerConfig: {
                        interceptors: [
                            lengthLimitSerializeInterceptor,
                            execptionSerializeInterceptor,
                            packetIfySerializeInterceptor,
                        ]
                    },
                    getResponseTopic(topic) {
                        return `${topic}/reply`
                    },
                    deserializerConfig: {
                        interceptors: [
                            packetifyInterceptor
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
                    LoggerFilter,
                    ExecptionFinalizeFilter,
                    ExecptionHandlerFilter,
                    FinalizeFilter
                ]
            }
        }
    }

}