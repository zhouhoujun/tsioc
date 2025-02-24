import { InjectFlags, isString, promisify, tokenId } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import {
    deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    ev,
    FileAdapter, MimeAdapter, NotSupportedExecption,
    messageVaildateInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, TopicClientIncomingFactory, TopicOutgoingFactory,
    IReadable,
    TEXT_DECODER
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport, requestSerializeBackend, requestTimeoutInterceptor
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory, DefaultServerTransport,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerFilter, execptionSerializeInterceptor,
    lengthLimitSerializeInterceptor, SERVER_MODULES,
    ServerTransferFactory, ServiceModuleOpts, TopicRequestContext,
    contextSerializeBackend
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




// const sizeLimit = 65515; //1024 * 64 - 20;
// const sizeLimit = 1048576; //1024 * 1024;
const sizeLimit = 5242880; //1024 * 1024 * 5;
// const sizeLimit = 10485760; //1024 * 1024 * 10;

export const REDIS_PATTERN = tokenId<string>('REDIS_PATTERN');

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
            defaultConfig: {
                handlerType: RedisHandler,
                // url: 'redis://localhost:6379',
                connectOpts: {
                    host: LOCALHOST,
                    port: 6379,
                },
                interceptorsToken: REDIS_CLIENT_INTERCEPTORS,
                filtersToken: REDIS_CLIENT_FILTERS,
                formatter: RedisPatternFormatter,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter, streamAdapter: StreamAdapter,
                        incomingFactory: TopicClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        const decoder = new TextDecoder();
                        return {
                            create: (injector, socket, options) => {
                                const subscribes = new Set<string>();
                                return new DefaultClientTransport<ReidsSocket, RedisRequest<any>, string | Buffer | IReadable>(
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
                                    options,
                                    (socket, factory, instance) => merge(
                                        fromEvent(socket.subscriber, ev.MESSAGE_BUFFER, (topic: string | Buffer, payload: string | Buffer) => {
                                            const context = instance ?? factory()
                                            const req = context.get(RedisRequest);
                                            const topicStr = isString(topic) ? topic : context.get(TEXT_DECODER).decode(topic);
                                            if(topicStr !== req?.responseTopic) return null;
                                            context.incoming = payload;
                                            return context;
                                        }),
                                        fromEvent(socket.subscriber, 'pmessageBuffer', (pattern: string, topic: string | Buffer, payload: string | Buffer) => {
                                            const context = instance ?? factory()
                                            const req = context.get(RedisRequest);
                                            const topicStr = isString(topic) ? topic : context.get(TEXT_DECODER).decode(topic);
                                            if(topicStr !== req?.responseTopic) return null;
                                            context.set(REDIS_PATTERN, pattern);                                            
                                            context.incoming = payload;
                                            return context;
                                        })
                                    ).pipe(filter(msg => !!msg)),
                                    async (socket, msg, req) => {
                                        if (req.responseTopic && !subscribes.has(req.responseTopic)) {
                                            subscribes.add(req.responseTopic);
                                            await promisify<string>(socket.subscriber.subscribe, socket.subscriber)(req.responseTopic);
                                        }
                                        if (streamAdapter.isReadable(msg)) throw new NotSupportedExecption('Not supported stream payload');
                                        return await promisify<string, Buffer | string>(socket.publisher.publish, socket.publisher)(req.topic, msg ?? Buffer.alloc(0))
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
                        [StatusAdapter, InjectFlags.Optional],
                        HeaderAdapter,
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
                    limit: sizeLimit,
                },
                interceptors: [
                    requestTimeoutInterceptor
                ]
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'redis',
            asDefault: true,
            serverType: RedisServer,
            defaultConfig: {
                handlerType: RedisRequestHandler,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: TopicClientIncomingFactory, outgoingFactory: TopicOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        const decoder = new TextDecoder();
                        return {
                            create: (injector, socket, options) => {
                                return new DefaultServerTransport<ReidsSocket, TopicRequestContext, string | Buffer | IReadable>(
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
                                    (socket, factory, instance) => merge(
                                        fromEvent(socket.subscriber, ev.MESSAGE_BUFFER, (topic: string | Buffer, payload: string | Buffer) => {
                                            const context = instance ?? factory()
                                            const topicStr = isString(topic) ? topic : context.get(TEXT_DECODER).decode(topic);
                                            if (topicStr.endsWith('.reply')) return null;
                                            context.incoming = payload;
                                            return context;
                                        }),
                                        fromEvent(socket.subscriber, 'pmessageBuffer', (pattern: string, topic: string | Buffer, payload: string | Buffer) => {
                                            const context = instance ?? factory()
                                            const topicStr = isString(topic) ? topic : context.get(TEXT_DECODER).decode(topic);
                                            if (topicStr.endsWith('.reply')) return null;
                                            context.set(REDIS_PATTERN, pattern);
                                            context.incoming = payload;
                                            return context;
                                        })
                                    ).pipe(
                                        filter(m => !!m)
                                    ),
                                    (socket, msg, requestContext) => {
                                        if (streamAdapter.isReadable(msg)) throw new NotSupportedExecption('Not supported stream payload');
                                        if (!requestContext.responseTopic) throw new NotSupportedExecption('Not need response');
                                        return promisify<string, Buffer | string>(socket.publisher.publish, socket.publisher)(requestContext.responseTopic, msg ?? Buffer.alloc(0))
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
                        TopicClientIncomingFactory,
                        TopicOutgoingFactory,
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
                    limit: sizeLimit,
                    getResponseTopic(topic) {
                        return `${topic}.reply`
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
                    LoggerFilter,
                    ExecptionFinalizeFilter,
                    ExecptionHandlerFilter,
                    FinalizeFilter
                ],
                routes: {
                    formatter: RedisPatternFormatter
                }
            }
        }
    }
}
