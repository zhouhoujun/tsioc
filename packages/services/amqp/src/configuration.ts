import { InjectFlags, isString } from '@tsdi/ioc';
import { Bean, Configuration, ContextToken, ExecptionHandlerFilter, HandlerFn, InterceptorFn } from '@tsdi/core';
import { DefaultResponseFactory, HeaderAdapter, HeaderMappings, IHeaders, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    FileAdapter, MimeAdapter, NotSupportedExecption, Packet, bodyDesrializeBackend,
    messageVaildateInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, TopicClientIncomingFactory, TopicOutgoingFactory,
    TransportContext,
    IReadable,
    ev
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
import { filter, map } from 'rxjs';
import { AmqpClient } from './client/client';
import { AMQP_CLIENT_FILTERS, AMQP_CLIENT_INTERCEPTORS, AmqpClientConfig } from './client/options';
import { AmqpHandler } from './client/handler';
import { AmqpServer } from './server/server';
import { AMQP_SERV_FILTERS, AMQP_SERV_GUARDS, AMQP_SERV_INTERCEPTORS, AmqpServConfig } from './server/options';
import { AmqpRequestHandler } from './server/handler';
import { AmqpRequest } from './client/request';
// import { AmqpSocket, AMQP_MESSAGE } from './socket';
import { Channel, ConsumeMessage } from 'amqplib';


const AMQP_MESSAGE = new ContextToken<ConsumeMessage>(() => null!);

const sizeLimit = 1048576; // 1024 * 1024;
// const defaultMaxSize = 524288; //1024 * 512;

const attachIncomingHeaders: InterceptorFn = (input: any, next: HandlerFn, context: TransportContext) => {
    return next(input, context)
        .pipe(
            map(body => {
                const pkg: any = { body };
                const msg = context.get(AMQP_MESSAGE)!;
                pkg.topic = msg.properties.messageId;
                pkg.id = msg.properties.correlationId;
                const headers = {
                    'content-type': msg.properties.contentType,
                    'content-encoding': msg.properties.contentEncoding,
                } as IHeaders;
                msg.properties.headers && Object.keys(msg.properties.headers).forEach(key => {
                    headers[key] = msg.properties.headers?.[key];
                });
                pkg.headers = headers;
                pkg.responseTopic = msg.properties.replyTo;

                return pkg;
            })
        )
}


@Configuration()
export class AmqpConfiguration {

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
            transport: 'amqp',
            asDefault: true,
            clientType: AmqpClient,
            defaultConfig: {
                handlerType: AmqpHandler,
                interceptorsToken: AMQP_CLIENT_INTERCEPTORS,
                filtersToken: AMQP_CLIENT_FILTERS,
                connectOpts: `amqp://${LOCALHOST}`,
                queue: 'amqp.queue',
                replyQueue: 'amqp.queue.reply',
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory, formatter: PatternFormatter | null,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        incomingFactory: TopicClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options: AmqpClientConfig) => {
                                return new DefaultClientTransport<Channel, AmqpRequest<any>, Buffer | string | IReadable, AmqpClientConfig>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: requestBodySerializeBackend,
                                        ...options.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, {
                                        backend: bodyDesrializeBackend,
                                        ...options.deserializerConfig
                                    }),
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
                                        const req = instance?.get(AmqpRequest);
                                        return formEvent(socket, ev.MESSAGE, (queue: string, message: ConsumeMessage) => message)
                                            .pipe(
                                                map((m: ConsumeMessage) => {
                                                    if (m && m.properties.replyTo == options.replyQueue && req?.topic == m.properties.messageId && m.properties.correlationId == req?.id) {
                                                        const context= instance ?? factory();
                                                        context.set(AMQP_MESSAGE, m);
                                                       
                                                        context.incoming = m.content;
                                                        return context;
                                                    }
                                                    return null;
                                                }),
                                                filter(r=>  !!r)
                                            )
                                    },

                                    async (socket, msg, req) => {
                                        if (streamAdapter.isReadable(msg)) throw new NotSupportedExecption('Not supported stream payload');

                                        const headers = req.headers.getHeaders();
                                        socket.sendToQueue(options.queue!, isString(msg)? Buffer.from(msg) : msg ?? Buffer.alloc(0), {
                                            ...options.publishOpts,
                                            messageId: req.topic,
                                            correlationId: String(req.id),
                                            replyTo: options.replyQueue,
                                            headers,
                                            contentType: headers?.['content-type'] as string,
                                            contentEncoding: headers?.['content-endcoding'] as string,
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
                        attachIncomingHeaders
                    ]
                },
                transportOptions: {
                    limit: sizeLimit
                },
                interceptors: [
                    requestTimeoutInterceptor
                ]
            } as AmqpClientConfig
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'amqp',
            asDefault: true,
            serverType: AmqpServer,
            defaultConfig: {
                handlerType: AmqpRequestHandler,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: TopicClientIncomingFactory, outgoingFactory: TopicOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        return {
                            create: (injector, socket, options: AmqpServConfig) => {
                                return new DefaultServerTransport<Channel, TopicRequestContext, Buffer | string | IReadable>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: contextBodySerializeBackend,
                                        ...options.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, {
                                        backend: bodyDesrializeBackend,
                                        ...options.deserializerConfig
                                    }),
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
                                    (socket, factory, instance) => {
                                        const req = instance?.get(AmqpRequest);
                                        return formEvent(socket, ev.MESSAGE, (queue: string, message: ConsumeMessage) => message)
                                            .pipe(
                                                map((m: ConsumeMessage) => {
                                                    if (m && m.properties.replyTo == options.replyQueue && req?.topic == m.fields.routingKey && m.properties.correlationId == req?.id) {
                                                        const context= instance ?? factory();
                                                        context.set(AMQP_MESSAGE, m);
                                                       
                                                        context.incoming = m.content;
                                                        return context;
                                                    }
                                                    return null;
                                                }),
                                                filter(r=>  !!r)
                                            )
                                    },

                                    async (socket, msg, reqContext) => {
                                        if (streamAdapter.isReadable(msg)) throw new NotSupportedExecption('Not supported stream payload');

                                        const headers = ((reqContext.response.headers instanceof HeaderMappings)? reqContext.response.headers.getHeaders(): reqContext.response.headers) as IHeaders ?? reqContext.response.getHeaders?.();
                    
                                        socket.sendToQueue(options.queue!, isString(msg)? Buffer.from(msg) : msg ?? Buffer.alloc(0), {
                                            ...options.publishOpts,
                                            messageId: reqContext.request.topic,
                                            correlationId: String(reqContext.response.id ?? reqContext.request.id),
                                            replyTo: reqContext.responseTopic ?? options.replyQueue,
                                            headers,
                                            contentType: headers?.['content-type'] as string,
                                            contentEncoding: headers?.['content-endcoding'] as string,
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
                        attachIncomingHeaders
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
                queue: 'amqp.queue',
                replyQueue: 'amqp.queue.reply',
                serverOpts: 'amqp://localhost',
                detailError: false,
                interceptorsToken: AMQP_SERV_INTERCEPTORS,
                filtersToken: AMQP_SERV_FILTERS,
                guardsToken: AMQP_SERV_GUARDS,
                filters: [
                    LoggerFilter,
                    ExecptionFinalizeFilter,
                    ExecptionHandlerFilter,
                    FinalizeFilter
                ]
            } as AmqpServConfig
        }
    }

}
function formEvent(socket: Channel, MESSAGE: string, arg2: (queue: string, message: ConsumeMessage) => ConsumeMessage): import("rxjs").Observable<any> {
    throw new Error('Function not implemented.');
}

