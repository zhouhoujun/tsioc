import { InjectFlags, promisify, tokenId } from '@tsdi/ioc';
import { DefaultResponseFactory, HeaderAdapter, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    CLIENT_MODULES, ClientModuleOpts, ClientTransferFactory, DefaultClientTransferFactory,
    DefaultClientTransport, requestServializeInterceptor
} from '@tsdi/common/client';
import {
    deatchPacketIdInterceptor, DefaultDeserializerFactory, DefaultSerializerFactory,
    DeserializerFactory, ev, FileAdapter, MimeAdapter, NotSupportedExecption, packetifyInterceptor,
    messageVaildateInterceptor, Redirector, SerializerFactory, StatusAdapter, StreamAdapter,
    UrlClientIncomingFactory, UrlOutgoingFactory
} from '@tsdi/common/transport';
import { Bean, Configuration, ExecptionHandlerFilter } from '@tsdi/core';
import {
    AcceptsPriority, DefaultServerTransferFactory, DefaultServerTransport,
    ExecptionFinalizeFilter, FinalizeFilter, LoggerFilter,
    requestContextServializeInterceptor, lengthLimitSerializeInterceptor, SERVER_MODULES,
    ServerTransferFactory, ServiceModuleOpts, UrlRequestContext
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
            defaultOpts: {
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
                                const transportOptions = options.transportOptions ?? {};
                                return new DefaultClientTransport<Socket, UdpRequest<any>>(
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
                                    (socket, req, context) => fromEvent(socket, ev.MESSAGE, (payload: Buffer, rinfo: RemoteInfo) => {
                                        // if (req?.remoteInfo.address !== rinfo.address || req.remoteInfo.port !== rinfo.port) return null;
                                        context.set(REMOTE_INFO, rinfo);
                                        return { payload }
                                    }).pipe(filter(r => r !== null)),
                                    async (socket, msg, req) => {
                                        if (streamAdapter.isReadable(msg.payload)) throw new NotSupportedExecption('Not supported stream payload');
                                        return await promisify<Buffer | string, number, string>(socket.send, socket)(msg.payload ?? Buffer.alloc(0), req.remoteInfo.port, req.remoteInfo.address)
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
                transportOptions: {
                    limit: sizeLimit,
                    serializerConfig: {
                        interceptors: [
                            messageVaildateInterceptor,
                            requestServializeInterceptor
                        ]
                    },
                    deserializerConfig: {
                        interceptors: [
                            packetifyInterceptor,
                            deatchPacketIdInterceptor,
                        ]
                    }
                },
            }
        }
    }

    private getServOptions(): ServiceModuleOpts {
        return {
            transport: 'udp',
            serverType: UdpServer,
            defaultOpts: {
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
                                const transportOptions = options.transportOptions ?? {};
                                return new DefaultServerTransport<Socket, UrlRequestContext>(
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
                                    (socket, context) => fromEvent(socket, ev.MESSAGE, (payload: Buffer, rinfo: RemoteInfo) => {
                                        context.set(REMOTE_INFO, rinfo);
                                        return { payload, properties: rinfo }
                                    }),
                                    (socket, msg, requestContext) => {
                                        if (streamAdapter.isReadable(msg.payload)) throw new NotSupportedExecption('Not supported stream payload');
                                        const rinfo = requestContext.request.properties as RemoteInfo;

                                        if (!rinfo) throw new NotSupportedExecption('No remote response to');
                                        return promisify<Buffer | string, number, string>(socket.send, socket)(msg.payload ?? Buffer.alloc(0), rinfo.port, rinfo.address);
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
                transportOptions: {
                    limit: sizeLimit,
                    serializerConfig: {
                        interceptors: [
                            lengthLimitSerializeInterceptor,
                            requestContextServializeInterceptor,
                        ]
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