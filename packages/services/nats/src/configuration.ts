import { InjectFlags, promisify } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { DefaultResponseFactory, HeaderAdapter, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    DeatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    ev,
    FileAdapter, MimeAdapter, NotSupportedExecption, PacketifyInterceptor,
    PacketVaildateInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, TopicClientIncomingFactory, TopicOutgoingFactory
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    RequestServializeInterceptor, DefaultClientTransport,
    RequestTimeoutInterceptor
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory, DefaultServerTransport,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor,
    RequestContextServializeInterceptor, RequestContextVaildateInterceptor,
    SERVER_MODULES, ServerTransferFactory, ServiceModuleOpts,
    TopicRequestContext
} from '@tsdi/endpoints';
import { filter, fromEvent } from 'rxjs';
import { Msg, MsgHdrs, NatsConnection, SubscriptionOptions, headers as createHeaders, Subscription } from 'nats';
import { NatsClient } from './client/client';
import { NATS_CLIENT_FILTERS, NATS_CLIENT_INTERCEPTORS } from './client/options';
import { NatsHandler } from './client/handler';
import { NatsServer } from './server/server';
import { NATS_SERV_FILTERS, NATS_SERV_GUARDS, NATS_SERV_INTERCEPTORS } from './server/options';
import { NatsRequestHandler } from './server/handler';
import { NatsRequest } from './client/request';



const sizeLimit = 1048576; // 1024 * 1024;
// const defaultMaxSize = 524288; //1024 * 512;



@Configuration()
export class NatsConfiguration {

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
            clientType: NatsClient,
            defaultOpts: {
                handlerType: NatsHandler,
                url: 'mqtt://localhost:1883',
                interceptorsToken: NATS_CLIENT_INTERCEPTORS,
                filtersToken: NATS_CLIENT_FILTERS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory, formatter: PatternFormatter | null,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        incomingFactory: TopicClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options) => {
                                const transportOptions = options.transportOptions ?? {};
                                const subscribes = new Set<string>();
                                return new DefaultClientTransport<NatsConnection, NatsRequest<any>>(
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
                                    options,
                                    (socket, channel, req) => fromEvent(socket, ev.MESSAGE, (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => {
                                        return { topic, payload }
                                    }).pipe(filter(msg => msg.topic === req?.responseTopic)),
                                    async (mqtt, msg, req) => {
                                        
                                        const headers = createHeaders();
                                        options.publishOpts?.headers && options.publishOpts.headers.keys().forEach(k => {
                                            headers.set(k, options.publishOpts?.headers?.get(k) ?? '')
                                        })
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
                            PacketVaildateInterceptor,
                            // PacketSerializeInterceptor,
                            RequestServializeInterceptor
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [
                            PacketifyInterceptor,
                            DeatchPacketIdInterceptor,
                            // PacketDeserializeInterceptor,
                            // PayloadDeserializeInterceptor
                        ]
                    }
                },
                interceptors: [
                    RequestTimeoutInterceptor
                ]
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'mqtt',
            asDefault: true,
            serverType: NatsServer,
            defaultOpts: {
                handlerType: NatsRequestHandler,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: TopicClientIncomingFactory, outgoingFactory: TopicOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        return {
                            create: (injector, socket, options) => {
                                const transportOptions = options.transportOptions ?? {};
                                return new DefaultServerTransport<NatsConnection, TopicRequestContext>(
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
                                    options,
                                    (conn) => fromEvent(conn, ev.MESSAGE, (topic: string, payload: Buffer, packet: mqtt.IPublishPacket) => {
                                        return { topic, responseTopic: packet.properties?.responseTopic, payload }
                                    }).pipe(
                                        filter(m => !!m.responseTopic || !m.topic.endsWith('/reply'))
                                    ),
                                    (conn, msg, requestContext) => {
                                        if (streamAdapter.isReadable(msg.payload)) throw new NotSupportedExecption('Not supported stream payload');
                                        if (!requestContext.responseTopic) throw new NotSupportedExecption('Not need response');
                                        return promisify<string, Buffer | string, mqtt.IClientPublishOptions>(conn.publish, conn)(requestContext.responseTopic, msg.payload ?? Buffer.alloc(0), { qos: 1 })
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
                            RequestContextVaildateInterceptor,
                            RequestContextServializeInterceptor,
                        ]
                    },
                    getResponseTopic(topic) {
                        return `${topic}/reply`
                    },
                    deserializerConfig: {
                        interceptors: [
                            PacketifyInterceptor,
                            // PacketDeserializeInterceptor,
                            // PayloadDeserializeInterceptor
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
                interceptorsToken: NATS_SERV_INTERCEPTORS,
                filtersToken: NATS_SERV_FILTERS,
                guardsToken: NATS_SERV_GUARDS,
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