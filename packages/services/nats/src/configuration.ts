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
import { defer, map, of } from 'rxjs';
import { NatsClient } from './client/client';
import { NATS_CLIENT_FILTERS, NATS_CLIENT_INTERCEPTORS, NatsClientOpts } from './client/options';
import { NatsHandler } from './client/handler';
import { NatsServer } from './server/server';
import { NATS_SERV_FILTERS, NATS_SERV_GUARDS, NATS_SERV_INTERCEPTORS, NatsMicroServOpts } from './server/options';
import { NatsRequestHandler } from './server/handler';
import { NatsRequest } from './client/request';
import { NatsSocket, NATS_MESSAGE } from './socket';
import { NatsPatternFormatter } from './pattern';



const sizeLimit = 1048576; // 1024 * 1024;
// const defaultMaxSize = 524288; //1024 * 512;

const attachHeaders: InterceptorFn = (input: any, next: HandlerFn, context: TransportContext) => {
    return next(input, context)
        .pipe(
            map(body => {
                const pkg: any = { body };
                const msg = context.get(NATS_MESSAGE)!;
                pkg.topic = msg.subject;
                pkg.id = msg.headers?.get('identity');
                const headers = {} as IHeaders;
                msg.headers?.keys().forEach(key => {
                    headers[key] = msg.headers?.get(key);
                });
                pkg.headers = headers;

                return pkg;
            })
        )
}


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
            transport: 'nats',
            asDefault: true,
            clientType: NatsClient,
            defaultOpts: {
                handlerType: NatsHandler,
                interceptorsToken: NATS_CLIENT_INTERCEPTORS,
                filtersToken: NATS_CLIENT_FILTERS,
                connectOpts: {
                    servers: `nats://${LOCALHOST}:4222`
                },
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory, formatter: PatternFormatter | null,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        incomingFactory: TopicClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options: NatsClientOpts) => {
                                return new DefaultClientTransport<NatsSocket, NatsRequest<any>, Buffer | string | IReadable, NatsClientOpts>(
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
                                    (socket, req, context) => {
                                        socket.subscribe(req!.responseTopic, options.subscriptionOpts);
                                        return socket.getPacket(context, r => r.subject == req!.responseTopic)
                                    },

                                    (socket, msg, req) => {
                                        const headers = socket.mergeHeaders(req.headers, options.publishOpts?.headers);
                                        req.id && headers.set('identity', String(req.id));
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
                { provide: PatternFormatter, useClass: NatsPatternFormatter }
            ]
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'nats',
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
                            create: (injector, socket, options: NatsMicroServOpts) => {
                                return new DefaultServerTransport<NatsSocket, TopicRequestContext, Buffer | string | IReadable>(
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
                                    (socket, context) => socket.getPacket(context, m => !m.subject.endsWith('.reply')),
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
                    servers: `nats://${LOCALHOST}:4222`
                },
                detailError: false,
                interceptorsToken: NATS_SERV_INTERCEPTORS,
                filtersToken: NATS_SERV_FILTERS,
                guardsToken: NATS_SERV_GUARDS,
                filters: [
                    LoggerFilter,
                    ExecptionFinalizeFilter,
                    ExecptionHandlerFilter,
                    FinalizeFilter
                ]
            },
            providers: [
                { provide: PatternFormatter, useClass: NatsPatternFormatter }
            ]
        }
    }

}