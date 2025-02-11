import { InjectFlags, isString, promisify } from '@tsdi/ioc';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import { DefaultResponseFactory, HeaderAdapter, LOCALHOST, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    ClientIncoming,
    DeatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory, DeserializerFactory,
    FileAdapter, Incoming, isBuffer, MimeAdapter, NotSupportedExecption, Packet,
    PacketVaildateInterceptor, Redirector, SerializerFactory, StatusAdapter,
    StreamAdapter, toBuffer, TopicClientIncomingFactory, TopicOutgoingFactory,
    TransportContext
} from '@tsdi/common/transport';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport, RequestTimeoutInterceptor
} from '@tsdi/common/client';
import {
    AcceptsPriority, DefaultServerTransferFactory, DefaultServerTransport,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor,
    RequestContextVaildateInterceptor,
    SERVER_MODULES, ServerTransferFactory, ServiceModuleOpts,
    TopicRequestContext
} from '@tsdi/endpoints';
import { defer, of } from 'rxjs';
import { NatsClient } from './client/client';
import { NATS_CLIENT_FILTERS, NATS_CLIENT_INTERCEPTORS, NatsClientOpts } from './client/options';
import { NatsHandler } from './client/handler';
import { NatsServer } from './server/server';
import { NATS_SERV_FILTERS, NATS_SERV_GUARDS, NATS_SERV_INTERCEPTORS, NatsMicroServOpts } from './server/options';
import { NatsRequestHandler } from './server/handler';
import { NatsRequest } from './client/request';
import { NatsSocket } from './socket';
import { NatsPatternFormatter } from './pattern';



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
                                const transportOptions = options.transportOptions ?? {};
                                return new DefaultClientTransport<NatsSocket, NatsRequest<any>, NatsClientOpts>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: (input: NatsRequest<any>, context?: TransportContext) => {
                                            return defer(async () => {
                                                let payload: any = input.body;
                                                if (payload == null || isString(payload) || isBuffer(payload)) return { payload };
                                                if (payload instanceof Uint8Array) return { payload: Buffer.from(payload) };
                                                if (streamAdapter.isReadable(payload)) throw new NotSupportedExecption('Not supported stream payload');
                                                // if (streamAdapter.isReadable(payload)) {
                                                //     return await toBuffer(payload);
                                                // }
                                                return { payload: JSON.stringify(payload) }
                                            })
                                        },
                                        ...transportOptions.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, {
                                        backend: (input: Packet, context: TransportContext) => {
                                            const incoming = {...input } as ClientIncoming;
                                            return of(input);
                                        },
                                        ...transportOptions.deserializerConfig,
                                    }),
                                    formatter,
                                    statusAdapter,
                                    headerAdapter,
                                    streamAdapter,
                                    incomingFactory,
                                    transferFactory.create(injector, transportOptions.transferConfig),
                                    responseFactory,
                                    redirector,
                                    options,
                                    (socket, channel, req) => {
                                        socket.subscribe(req!.responseTopic, options.subscriptionOpts);
                                        return socket.getPacket(r => r.subject == req!.responseTopic)
                                    },

                                    (socket, msg, req) => {
                                        const headers = socket.mergeHeaders(req.headers, options.publishOpts?.headers);
                                        req.id && headers.set('identity', String(req.id));
                                        if (streamAdapter.isReadable(msg.payload)) throw new NotSupportedExecption('Not supported stream payload');

                                        return socket.publish(req.topic, msg.payload ?? Buffer.alloc(0), {
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
                transportOptions: {
                    limit: sizeLimit,
                    serializerConfig: {
                        interceptors: [
                            PacketVaildateInterceptor
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [
                            DeatchPacketIdInterceptor
                        ]
                    }
                },
                interceptors: [
                    RequestTimeoutInterceptor
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
                                const transportOptions = options.transportOptions ?? {};
                                return new DefaultServerTransport<NatsSocket, TopicRequestContext>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: (input: TopicRequestContext, context?: TransportContext) => {
                                            return defer(async () => {
                                                let payload: any = input.body;
                                                if (payload == null || isString(payload) || isBuffer(payload)) return { payload };
                                                if (payload instanceof Uint8Array) return { payload: Buffer.from(payload) };
                                                if (streamAdapter.isReadable(payload)) throw new NotSupportedExecption('Not supported stream payload');
                                                // if (streamAdapter.isReadable(payload)) {
                                                //     return await toBuffer(payload);
                                                // }
                                                return { payload: JSON.stringify(payload) }
                                            })
                                        },
                                        ...transportOptions.serializerConfig
                                    }),
                                    deserializerFactory.create(injector, {
                                        backend: (input: Packet, context: TransportContext) => {
                                            return of(input);
                                        },
                                        ...transportOptions.deserializerConfig
                                    }),
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
                                    (socket) => socket.getPacket(m => !m.subject.endsWith('.reply')),
                                    (socket, msg, requestContext) => {
                                        if (streamAdapter.isReadable(msg.payload)) throw new NotSupportedExecption('Not supported stream payload');
                                        if (!requestContext.responseTopic) throw new NotSupportedExecption('Not need response');
                                        const headers = socket.mergeHeaders(requestContext.response.headers, options.publishOpts?.headers);
                                        requestContext.request.id && headers.set('identity', String(requestContext.request.id));
                                        if(requestContext.execption) {
                                            headers.hasError = true;
                                        }           
                                        headers.code = requestContext.status;
                                        headers.status = requestContext.statusMessage; 
                                        headers.description = requestContext.statusMessage;                                        

                                        return socket.publish(requestContext.responseTopic, msg.payload ?? Buffer.alloc(0), {
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
                transportOptions: {
                    limit: sizeLimit,
                    serializerConfig: {
                        interceptors: [
                            RequestContextVaildateInterceptor
                        ]
                    },
                    getResponseTopic(topic) {
                        return `${topic}.reply`
                    },
                    deserializerConfig: {
                        interceptors: [
                        ]
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
                    LoggerInterceptor,
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