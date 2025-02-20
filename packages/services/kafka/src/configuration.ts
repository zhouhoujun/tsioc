import { InjectFlags } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter, HandlerFn, InterceptorFn } from '@tsdi/core';
import { DefaultResponseFactory, HeaderAdapter, IHeaders, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    FileAdapter, MimeAdapter, NotSupportedExecption, Packet,
    messageVaildateInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, TopicClientIncomingFactory, TopicOutgoingFactory,
    TransportContext,
    IReadable
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport, requestBodySerializeBackend, requestTimeoutInterceptor
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory, DefaultServerTransport,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerFilter,
    execptionSerializeInterceptor, lengthLimitSerializeInterceptor,
    SERVER_MODULES, ServerTransferFactory, ServiceModuleOpts,
    TopicRequestContext,
    contextBodySerializeBackend
} from '@tsdi/endpoints';
import { map } from 'rxjs';
import { KafkaClient } from './client/client';
import { KAFKA_CLIENT_FILTERS, KAFKA_CLIENT_INTERCEPTORS, KafkaClientOpts } from './client/options';
import { KafkaHandler } from './client/handler';
import { KafkaServer } from './server/server';
import { KAFKA_SERV_FILTERS, KAFKA_SERV_GUARDS, KAFKA_SERV_INTERCEPTORS, KafkaServerOptions } from './server/options';
import { KafkaRequestHandler } from './server/handler';
import { KafkaRequest } from './client/request';
import { KafkaSocket, KAFKA_MESSAGE } from './socket';
import { KafkaPatternFormatter } from './pattern';
import { DEFAULT_BROKERS, KafkaHeaders, parseHead } from './const';



const sizeLimit = 1048576; // 1024 * 1024;
// const defaultMaxSize = 524288; //1024 * 512;

const attachHeaders: InterceptorFn = (input: any, next: HandlerFn, context: TransportContext) => {
    return next(input, context)
        .pipe(
            map(body => {
                const pkg: any = { body };
                const msg = context.get(KAFKA_MESSAGE)!;
                pkg.topic = msg.topic;
                const kHeaders = msg.message.headers ?? {};
                pkg.id = kHeaders[KafkaHeaders.CORRELATION_ID]
                const headers = {} as IHeaders;
                Object.keys(kHeaders).forEach(key => {
                    headers[key] = parseHead(kHeaders[key]);
                });
                pkg.headers = headers;

                return pkg;
            })
        )
}


@Configuration()
export class KafkaConfiguration {

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
            transport: 'kafka',
            asDefault: true,
            clientType: KafkaClient,
            defaultOpts: {
                handlerType: KafkaHandler,
                interceptorsToken: KAFKA_CLIENT_INTERCEPTORS,
                filtersToken: KAFKA_CLIENT_FILTERS,
                connectOpts: {
                    brokers: DEFAULT_BROKERS
                },
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory, formatter: PatternFormatter | null,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        incomingFactory: TopicClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options: KafkaClientOpts) => {
                                return new DefaultClientTransport<KafkaSocket, KafkaRequest<any>, Buffer | string | IReadable, KafkaClientOpts>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: requestBodySerializeBackend,
                                        ...options.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, options.deserializerConfig),
                                    formatter,
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector, options.transferConfig),
                                    responseFactory,
                                    redirector,
                                    options,
                                    (socket, factory, instance) => {
                                        const req = instance?.get(KafkaRequest);
                                        req && socket.subscribe([req.responseTopic], options);
                                        return socket.getPacket(factory, r => req ? r.topic == req.responseTopic : true, instance)
                                    },

                                    (socket, msg, req) => {
                                        // const headers = socket.mergeHeaders(req.headers, options.publishOpts?.headers);
                                        // req?.id && headers.set('identity', String(req.id));
                                        if (streamAdapter.isReadable(msg)) throw new NotSupportedExecption('Not supported stream payload');

                                        return socket.publish(req.topic, msg ?? Buffer.alloc(0), {
                                            ...options.publishOpts,
                                            reply: req.responseTopic,
                                            headers
                                        })
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
                        deatchPacketIdInterceptor,
                        attachHeaders
                    ]
                },
                transportOptions: {
                    limit: sizeLimit
                },
                interceptors: [
                    requestTimeoutInterceptor
                ]
            },
            providers: [
                { provide: PatternFormatter, useClass: KafkaPatternFormatter }
            ]
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'kafka',
            asDefault: true,
            serverType: KafkaServer,
            defaultOpts: {
                handlerType: KafkaRequestHandler,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: TopicClientIncomingFactory, outgoingFactory: TopicOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        return {
                            create: (injector, socket, options: KafkaServerOptions) => {
                                return new DefaultServerTransport<KafkaSocket, TopicRequestContext, Buffer | string | IReadable>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: contextBodySerializeBackend,
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
                                    (socket, factory, instance) => socket.getPacket(factory, m => !m.topic.endsWith('.reply'), instance),
                                    (socket, msg, requestContext) => {
                                        if (streamAdapter.isReadable(msg)) throw new NotSupportedExecption('Not supported stream payload');
                                        if (!requestContext.responseTopic) throw new NotSupportedExecption('Not need response');
                                        const headers = socket.mergeHeaders(requestContext.response.headers, options.publishOpts?.headers);
                                        requestContext.request.id && headers.set('identity', String(requestContext.request.id));
                                        requestContext.status && headers.set('status', requestContext.status);
                                        requestContext.statusMessage && headers.set('statusMessage', requestContext.statusMessage);

                                        return socket.publish(requestContext.responseTopic, msg ?? Buffer.alloc(0), {
                                            ...options.publishOpts,
                                            headers
                                        })
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
                        execptionSerializeInterceptor,
                        lengthLimitSerializeInterceptor
                    ]
                },
                deserializerConfig: {
                    interceptors: [
                        attachHeaders
                    ]
                },
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
                    brokers: DEFAULT_BROKERS
                },
                detailError: false,
                interceptorsToken: KAFKA_SERV_INTERCEPTORS,
                filtersToken: KAFKA_SERV_FILTERS,
                guardsToken: KAFKA_SERV_GUARDS,
                filters: [
                    LoggerFilter,
                    ExecptionFinalizeFilter,
                    ExecptionHandlerFilter,
                    FinalizeFilter
                ]
            },
            providers: [
                { provide: PatternFormatter, useClass: KafkaPatternFormatter }
            ]
        }
    }

}