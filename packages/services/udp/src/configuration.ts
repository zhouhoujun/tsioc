import { InjectFlags, promisify, tokenId } from '@tsdi/ioc';
import { DefaultResponseFactory, HeaderAdapter, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport, requestSerializeBackend
} from '@tsdi/common/client';
import {
    deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory,
    DeserializerFactory, ev, FileAdapter, MimeAdapter, NotSupportedExecption,
    messageVaildateInterceptor, Redirector, SerializerFactory, StatusAdapter, StreamAdapter,
    UrlClientIncomingFactory, UrlOutgoingFactory,
    IReadable
} from '@tsdi/common/transport';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import {
    AcceptsPriority, DefaultServerTransferFactory, DefaultServerTransport,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerFilter, execptionSerializeInterceptor,
    lengthLimitSerializeInterceptor, SERVER_MODULES,
    ServerTransferFactory, ServiceModuleOpts, UrlRequestContext,
    contextSerializeBackend
} from '@tsdi/endpoints';
import { filter, fromEvent } from 'rxjs';
import { RemoteInfo, Socket } from 'dgram';

import { UdpClient } from './client/client';
import { UdpHandler } from './client/handler';
import { UDP_CLIENT_FILTERS, UDP_CLIENT_INTERCEPTORS } from './client/options';
import { UdpRequest } from './client/request';
import { sizeLimit } from './consts';

import { UdpRequestHandler } from './server/handler';
import { UDP_SERV_FILTERS, UDP_SERV_GUARDS, UDP_SERV_INTERCEPTORS } from './server/options';
import { UdpServer } from './server/server';

const REMOTE_INFO = tokenId<RemoteInfo>('REMOTE_INFO');

@Configuration()
export class UdpConfiguration {

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
            transport: 'udp',
            clientType: UdpClient,
            defaultConfig: {
                handlerType: UdpHandler,
                url: 'udp://localhost:3000',
                interceptorsToken: UDP_CLIENT_INTERCEPTORS,
                filtersToken: UDP_CLIENT_FILTERS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory, formatter: PatternFormatter | null,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        incomingFactory: UrlClientIncomingFactory, transferFactory: ClientTransferFactory, responseFactory: ResponseFactory,
                        redirector: Redirector | null) => {
                        return {
                            create: (injector, socket, options) => {
                                return new DefaultClientTransport<Socket, UdpRequest<any>, Buffer | string | IReadable>(
                                    injector,
                                    socket,
                                    serializerFactory.create(injector, {
                                        backend: requestSerializeBackend,
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
                                    (socket, factory, instance) => fromEvent(socket, ev.MESSAGE, (payload: Buffer, rinfo: RemoteInfo) => {
                                        const context = instance ?? factory()
                                        context.set(REMOTE_INFO, rinfo);
                                        context.incoming = payload;
                                        return context;
                                    }),
                                    async (socket, msg, req) => {
                                        if (streamAdapter.isReadable(msg)) throw new NotSupportedExecption('Not supported stream payload');
                                        return await promisify<Buffer | string, number, string>(socket.send, socket)(msg ?? Buffer.alloc(0), req.remoteInfo.port, req.remoteInfo.address)
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
                        UrlClientIncomingFactory,
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
                    ]
                },
                transportOptions: {
                    limit: sizeLimit
                },
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'udp',
            serverType: UdpServer,
            defaultConfig: {
                handlerType: UdpRequestHandler,
                interceptorsToken: UDP_SERV_INTERCEPTORS,
                filtersToken: UDP_SERV_FILTERS,
                guardsToken: UDP_SERV_GUARDS,
                transportFactory: {
                    useFactory: (serializerFactory: SerializerFactory, deserializerFactory: DeserializerFactory,
                        statusAdapter: StatusAdapter | null, headerAdapter: HeaderAdapter | null, streamAdapter: StreamAdapter,
                        fileAdapter: FileAdapter, mimeAdapter: MimeAdapter | null, acceptsPriority: AcceptsPriority | null,
                        incomingFactory: UrlClientIncomingFactory, outgoingFactory: UrlOutgoingFactory, transferFactory: ServerTransferFactory) => {
                        return {
                            create: (injector, socket, options) => {
                                return new DefaultServerTransport<Socket, UrlRequestContext, Buffer | string | IReadable>(
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
                                    (socket, factory, instance) => fromEvent(socket, ev.MESSAGE, (payload: Buffer, rinfo: RemoteInfo) => {
                                        const context = instance ?? factory()
                                        context.set(REMOTE_INFO, rinfo);
                                        context.incoming = payload;
                                        return context;
                                    }),
                                    (socket, msg, requestContext, context) => {
                                        if (streamAdapter.isReadable(msg)) throw new NotSupportedExecption('Not supported stream payload');
                                        const rinfo = context.get(REMOTE_INFO) as RemoteInfo;

                                        if (!rinfo) throw new NotSupportedExecption('No remote response to');
                                        return promisify<Buffer | string, number, string>(socket.send, socket)(msg ?? Buffer.alloc(0), rinfo.port, rinfo.address);
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
                        UrlClientIncomingFactory,
                        UrlOutgoingFactory,
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
                    limit: sizeLimit
                },
                content: {
                    root: 'public',
                    prefix: 'content'
                },
                detailError: false,
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