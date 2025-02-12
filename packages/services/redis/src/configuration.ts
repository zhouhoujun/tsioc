import { InjectFlags, isString, promisify } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import {
    DeatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    ev,
    FileAdapter, MimeAdapter, NotSupportedExecption, PacketifyInterceptor,
    PacketVaildateInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, TopicClientIncomingFactory, TopicOutgoingFactory
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport, RequestServializeInterceptor, RequestTimeoutInterceptor
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory, DefaultServerTransport,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor,
    RequestContextServializeInterceptor, RequestContextVaildateInterceptor, SERVER_MODULES,
    ServerTransferFactory, ServiceModuleOpts, TopicRequestContext
} from '@tsdi/endpoints';
import { RedisClient } from './client/client';
import { REDIS_CLIENT_FILTERS, REDIS_CLIENT_INTERCEPTORS } from './client/options';
import { RedisHandler } from './client/handler';
import { RedisServer } from './server/server';
import { REDIS_SERV_FILTERS, REDIS_SERV_GUARDS, REDIS_SERV_INTERCEPTORS } from './server/options';
import { RedisRequestHandler } from './server/handler';
import { DefaultResponseFactory, HeaderAdapter, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import { RedisPatternFormatter } from './pattern';
import { ReidsSocket } from './socket';
import { filter, fromEvent, merge } from 'rxjs';
import { RedisRequest } from './client/request';




// const defaultMaxSize = 65515; //1024 * 64 - 20;
const sizeLimit = 1048576; //1024 * 1024;
// const defaultMaxSize = 5242880; //1024 * 1024 * 5;
// const defaultMaxSize = 10485760; //1024 * 1024 * 10;



const delimiter = Buffer.from('#');

@Configuration()
export class RedisConfiguration {

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
            transport: 'redis',
            asDefault: true,
            clientType: RedisClient,
            defaultOpts: {
                handlerType: RedisHandler,
                // url: 'redis://localhost:6379',
                connectOpts: {
                    host: LOCALHOST,
                    port: 6379,
                },
                interceptorsToken: REDIS_CLIENT_INTERCEPTORS,
                filtersToken: REDIS_CLIENT_FILTERS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory, formatter: PatternFormatter | null,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        incomingFactory: TopicClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        const decoder = new TextDecoder();
                        return {
                            create: (injector, socket, options) => {
                                const transportOptions = options.transportOptions ?? {};
                                const subscribes = new Set<string>();
                                return new DefaultClientTransport<ReidsSocket, RedisRequest<any>>(
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
                                    (socket, req, context) => merge(
                                        fromEvent(socket.subscriber, ev.MESSAGE_BUFFER, (topic: string | Buffer, payload: string | Buffer) => {
                                            return { topic: isString(topic) ? topic : decoder.decode(topic), payload }
                                        }),
                                        fromEvent(socket.subscriber, 'pmessageBuffer', (pattern: string, topic: string | Buffer, payload: string | Buffer) => {
                                            return { pattern, topic: isString(topic) ? topic : decoder.decode(topic), payload }
                                        })
                                    ).pipe(filter(msg => msg.topic === req.responseTopic)),
                                    async (socket, msg, req) => {
                                        if (req.responseTopic && !subscribes.has(req.responseTopic)) {
                                            subscribes.add(req.responseTopic);
                                            await promisify<string>(socket.subscriber.subscribe, socket.subscriber)(req.responseTopic);
                                        }
                                        if (streamAdapter.isReadable(msg.payload)) throw new NotSupportedExecption('Not supported stream payload');
                                        return await promisify<string, Buffer | string>(socket.publisher.publish, socket.publisher)(req.topic, msg.payload ?? Buffer.alloc(0))
                                    },
                                    async (socket) => {
                                        if (subscribes.size) {
                                            await promisify(socket.subscriber.unsubscribe, socket.subscriber)()
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
                            RequestServializeInterceptor
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [
                            PacketifyInterceptor,
                            DeatchPacketIdInterceptor
                        ]
                    }
                },
                interceptors: [
                    RequestTimeoutInterceptor
                ],
                providers: [
                    { provide: PatternFormatter, useClass: RedisPatternFormatter }
                ]
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'redis',
            asDefault: true,
            serverType: RedisServer,
            defaultOpts: {
                handlerType: RedisRequestHandler,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: TopicClientIncomingFactory, outgoingFactory: TopicOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        const decoder = new TextDecoder();
                        return {
                            create: (injector, socket, options) => {
                                const transportOptions = options.transportOptions ?? {};
                                return new DefaultServerTransport<ReidsSocket, TopicRequestContext>(
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
                                    (socket) => merge(
                                        fromEvent(socket.subscriber, ev.MESSAGE_BUFFER, (topic: string | Buffer, payload: string | Buffer) => {
                                            return { topic: isString(topic) ? topic : decoder.decode(topic), payload }
                                        }),
                                        fromEvent(socket.subscriber, 'pmessageBuffer', (pattern: string, topic: string | Buffer, payload: string | Buffer) => {
                                            return { pattern, topic: isString(topic) ? topic : decoder.decode(topic), payload }
                                        })
                                    ).pipe(
                                        filter(m => !m.topic.endsWith('.reply'))
                                    ),
                                    (socket, msg, requestContext) => {
                                        if (streamAdapter.isReadable(msg.payload)) throw new NotSupportedExecption('Not supported stream payload');
                                        if (!requestContext.responseTopic) throw new NotSupportedExecption('Not need response');
                                        return promisify<string, Buffer | string>(socket.publisher.publish, socket.publisher)(requestContext.responseTopic, msg.payload ?? Buffer.alloc(0))
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
                    getResponseTopic(topic) {
                        return `${topic}.reply`
                    },
                    serializerConfig: {
                        interceptors: [
                            RequestContextVaildateInterceptor,
                            RequestContextServializeInterceptor,
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [
                            PacketifyInterceptor
                        ]
                    }
                },
                content: {
                    root: 'public',
                    prefix: 'content'
                },
                serverOpts: {
                    host: LOCALHOST,
                    port: 6379
                },
                detailError: false,
                interceptorsToken: REDIS_SERV_INTERCEPTORS,
                filtersToken: REDIS_SERV_FILTERS,
                guardsToken: REDIS_SERV_GUARDS,
                filters: [
                    LoggerInterceptor,
                    ExecptionFinalizeFilter,
                    ExecptionHandlerFilter,
                    FinalizeFilter
                ]
            },
            providers: [
                { provide: PatternFormatter, useClass: RedisPatternFormatter }
            ]
        }
    }
}
