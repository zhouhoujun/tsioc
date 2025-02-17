import { InjectFlags, promisify, tokenId } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { DefaultResponseFactory, HeaderAdapter, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    ev, FileAdapter, MimeAdapter, NotSupportedExecption,
    messageVaildateInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, TopicClientIncomingFactory, TopicOutgoingFactory,
    IReadable
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport, requestSerializeBackend, requestTimeoutInterceptor
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory, DefaultServerTransport,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerFilter, execptionSerializeInterceptor,
    lengthLimitSerializeInterceptor, contextSerializeBackend,
    SERVER_MODULES, ServerTransferFactory, ServiceModuleOpts,
    TopicRequestContext
} from '@tsdi/endpoints';
import * as mqtt from 'mqtt';
import { filter, fromEvent } from 'rxjs';
import { MqttClient } from './client/client';
import { MQTT_CLIENT_FILTERS, MQTT_CLIENT_INTERCEPTORS } from './client/options';
import { MqttHandler } from './client/handler';
import { MqttServer } from './server/server';
import { MQTT_SERV_FILTERS, MQTT_SERV_GUARDS, MQTT_SERV_INTERCEPTORS, MqttServiceOpts } from './server/options';
import { MqttRequestHandler } from './server/handler';
import { MqttRequest } from './client/request';



const sizeLimit = 1048576; // 1024 * 1024;
// const defaultMaxSize = 524288; //1024 * 512;

const MQTT_PUBLISH_PACKET = tokenId<mqtt.IPublishPacket>('MQTT_PUBLISH_PACKET')

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
                                const subscribes = new Set<string>();
                                return new DefaultClientTransport<mqtt.Client, MqttRequest<any>, string | Buffer | IReadable>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: requestSerializeBackend,
                                        ...options.serializerConfig
                                    }), deserializerFactory.create(injector, options.deserializerConfig),
                                    formatter,
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector, options.transferConfig),
                                    responseFactory,
                                    redirector,
                                    options,
                                    (mqtt, req, context) => fromEvent(mqtt, ev.MESSAGE, (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => {
                                        if (req.responseTopic == topic) {
                                            context.set(MQTT_PUBLISH_PACKET, packet);
                                            return payload;
                                        }
                                        return null
                                    }).pipe(filter(p => !!p)),
                                    async (mqtt, msg, req) => {
                                        if (req.responseTopic && !subscribes.has(req.responseTopic)) {
                                            subscribes.add(req.responseTopic);
                                            await promisify(mqtt.subscribe, mqtt)(req.responseTopic);
                                        }
                                        if (streamAdapter.isReadable(msg)) throw new NotSupportedExecption('Not supported stream payload');
                                        return await promisify<string, Buffer | string, mqtt.IClientPublishOptions>(mqtt.publish, mqtt)(req.topic, msg ?? Buffer.alloc(0), req.getExtentOptions())
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
                serializerConfig: {
                    interceptors: [
                        messageVaildateInterceptor
                    ]
                },
                deserializerConfig: {
                    interceptors: [
                        deatchPacketIdInterceptor
                    ]
                },
                transportOptions: {
                    limit: sizeLimit
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
                            create: (injector, socket, options: MqttServiceOpts) => {
                                return new DefaultServerTransport<mqtt.Client, TopicRequestContext, string | Buffer | IReadable>(
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
                                    options,
                                    (mqtt, context) => fromEvent(mqtt, ev.MESSAGE, (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => {
                                        if (topic.endsWith('/reply')) return null;
                                        context.set(MQTT_PUBLISH_PACKET, packet);
                                        return payload
                                    }).pipe(
                                        filter(m => !!m)
                                    ),
                                    (mqtt, msg, requestContext, context) => {
                                        if (streamAdapter.isReadable(msg)) throw new NotSupportedExecption('Not supported stream payload');
                                        if (!requestContext.responseTopic) throw new NotSupportedExecption('Not need response');
                                        const { qos, retain, dup } = (options.publishOptions ?? context.get(MQTT_PUBLISH_PACKET))!;
                                        return promisify<string, Buffer | string, mqtt.IClientPublishOptions>(mqtt.publish, mqtt)(requestContext.responseTopic, msg ?? Buffer.alloc(0), { retain, qos, dup })
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
                serializerConfig: {
                    interceptors: [
                        lengthLimitSerializeInterceptor,
                        execptionSerializeInterceptor,
                    ]
                },
                deserializerConfig: {},
                transportOptions: {
                    limit: sizeLimit,
                    getResponseTopic(topic) {
                        return `${topic}/reply`
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