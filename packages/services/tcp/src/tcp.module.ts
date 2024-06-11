import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST, Message, Packet } from '@tsdi/common';
import { CLIENT_MODULES, ClientOpts } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { TcpClient } from './client/client';
import { TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS } from './client/options';
import { TcpHandler } from './client/handler';
import { TcpServer } from './server/server';
import { TCP_MIDDLEWARES, TCP_SERV_FILTERS, TCP_SERV_GUARDS, TCP_SERV_INTERCEPTORS } from './server/options';
import { TcpEndpointHandler } from './server/handler';
import { TcpMessage, TcpMessageFactory } from './message';
import { TcpClientIncoming, TcpClientIncomingFactory, TcpIncoming, TcpIncomingFactory } from './incoming';
import { TcpOutgoingFactory } from './outgoing';
import { ClientIncomingPacket, IncomingPacket } from '@tsdi/common/transport';
import { TcpRequest } from './client/request';


// const defaultMaxSize = 65515; //65535 - 20;
// const defaultMaxSize = 1048576; // 1024 * 1024;
const defaultMaxSize = 5242880; //1024 * 1024 * 5;
// const defaultMaxSize = 10485760; //1024 * 1024 * 10;

@Module({
    providers: [
        TcpClient,
        TcpServer,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'tcp',
                microservice: true,
                clientType: TcpClient,
                hanlderType: TcpHandler,
                defaultOpts: {
                    interceptorsToken: TCP_CLIENT_INTERCEPTORS,
                    filtersToken: TCP_CLIENT_FILTERS,
                    messageFactory: { useClass: TcpMessageFactory },
                    incomingFactory: { useClass: TcpClientIncomingFactory },
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        encodings: {
                            end: TcpMessage,
                            defaults: [
                                [TcpRequest, Packet],
                                [TcpMessage, Message]
                            ]

                        },
                        decodings: {
                            defaults: [
                                [TcpClientIncoming, ClientIncomingPacket]
                            ]
                        }
                    }
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'tcp',
                clientType: TcpClient,
                hanlderType: TcpHandler,
                defaultOpts: {
                    interceptorsToken: TCP_CLIENT_INTERCEPTORS,
                    filtersToken: TCP_CLIENT_FILTERS,
                    messageFactory: { useClass: TcpMessageFactory },
                    incomingFactory: { useClass: TcpClientIncomingFactory },
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    }
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'tcp',
                microservice: true,
                serverType: TcpServer,
                handlerType: TcpEndpointHandler,
                defaultOpts: {
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        defaultMethod: '*',
                        maxSize: defaultMaxSize,
                        decodings: {
                            defaults: [
                                [TcpIncoming, IncomingPacket]
                            ]
                        }
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: false,
                    interceptorsToken: TCP_SERV_INTERCEPTORS,
                    filtersToken: TCP_SERV_FILTERS,
                    guardsToken: TCP_SERV_GUARDS,
                    messageFactory: { useClass: TcpMessageFactory },
                    incomingFactory: { useClass: TcpIncomingFactory },
                    outgoingFactory: { useClass: TcpOutgoingFactory },
                    filters: [
                        LoggerInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
                    ]
                }
            } as ServerModuleOpts,
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'tcp',
                serverType: TcpServer,
                handlerType: TcpEndpointHandler,
                defaultOpts: {
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        defaultMethod: 'GET',
                        maxSize: defaultMaxSize
                    },
                    content: {
                        root: 'public'
                    },
                    detailError: false,
                    interceptorsToken: TCP_SERV_INTERCEPTORS,
                    filtersToken: TCP_SERV_FILTERS,
                    guardsToken: TCP_SERV_GUARDS,
                    middlewaresToken: TCP_MIDDLEWARES,
                    messageFactory: { useClass: TcpMessageFactory },
                    incomingFactory: { useClass: TcpIncomingFactory },
                    outgoingFactory: { useClass: TcpOutgoingFactory },
                    filters: [
                        LoggerInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
                    ]
                }
            } as ServerModuleOpts,
            multi: true
        }
    ]
})
export class TcpModule {

}
