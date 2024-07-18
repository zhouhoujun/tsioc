import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST, Message, Packet, isResponseEvent } from '@tsdi/common';
import { CustomCodingsAdapter } from '@tsdi/common/codings';
import { CLIENT_MODULES, ClientModuleOpts } from '@tsdi/common/client';
import { ClientIncomingPacket, IncomingPacket, OutgoingPacket } from '@tsdi/common/transport';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, PatternRequestContext, RequestContext, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { TcpClient } from './client/client';
import { TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS } from './client/options';
import { TcpHandler } from './client/handler';
import { TcpServer } from './server/server';
import { TCP_MIDDLEWARES, TCP_SERV_FILTERS, TCP_SERV_GUARDS, TCP_SERV_INTERCEPTORS } from './server/options';
import { TcpRequestHandler } from './server/handler';
import { TcpMessage, TcpMessageFactory } from './message';
import { TcpClientIncoming, TcpClientIncomingFactory, TcpIncoming, TcpIncomingFactory } from './incoming';
import { TcpOutgoing, TcpOutgoingFactory } from './outgoing';
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
                    messageFactory: TcpMessageFactory,
                    incomingFactory: TcpClientIncomingFactory,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof TcpMessage, [[TcpRequest, Packet]]) },
                        decodingsAdapter: { useValue: new CustomCodingsAdapter(isResponseEvent, [[TcpClientIncoming, ClientIncomingPacket], [TcpMessage, Message]]) },
                    }
                }
            } as ClientModuleOpts,
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
                    messageFactory: TcpMessageFactory,
                    incomingFactory: TcpClientIncomingFactory,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof TcpMessage, [[TcpRequest, Packet]]) },
                        decodingsAdapter: { useValue: new CustomCodingsAdapter(isResponseEvent, [[TcpClientIncoming, ClientIncomingPacket], [TcpMessage, Message]]) },
                    }
                }
            } as ClientModuleOpts,
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'tcp',
                microservice: true,
                serverType: TcpServer,
                handlerType: TcpRequestHandler,
                defaultOpts: {
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        defaultMethod: '*',
                        maxSize: defaultMaxSize,
                        decodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof RequestContext, [[TcpIncoming, IncomingPacket], [TcpMessage, Message]]) },
                        encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof TcpMessage, [[PatternRequestContext, RequestContext], [TcpOutgoing, OutgoingPacket]]) },
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: false,
                    interceptorsToken: TCP_SERV_INTERCEPTORS,
                    filtersToken: TCP_SERV_FILTERS,
                    guardsToken: TCP_SERV_GUARDS,
                    messageFactory: TcpMessageFactory,
                    incomingFactory: TcpIncomingFactory,
                    outgoingFactory: TcpOutgoingFactory,
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
                handlerType: TcpRequestHandler,
                defaultOpts: {
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        defaultMethod: 'GET',
                        maxSize: defaultMaxSize,
                        decodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof RequestContext, [[TcpIncoming, IncomingPacket], [TcpMessage, Message]]) },
                        encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof TcpMessage, [[PatternRequestContext, RequestContext], [TcpOutgoing, OutgoingPacket]]) },
                    },
                    content: {
                        root: 'public'
                    },
                    detailError: false,
                    interceptorsToken: TCP_SERV_INTERCEPTORS,
                    filtersToken: TCP_SERV_FILTERS,
                    guardsToken: TCP_SERV_GUARDS,
                    middlewaresToken: TCP_MIDDLEWARES,
                    messageFactory: TcpMessageFactory,
                    incomingFactory: TcpIncomingFactory,
                    outgoingFactory: TcpOutgoingFactory,
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
