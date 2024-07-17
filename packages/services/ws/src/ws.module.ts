import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { CustomCodingsAdapter } from '@tsdi/common/codings';
import { CLIENT_MODULES, ClientModuleOpts } from '@tsdi/common/client';
import {
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, PatternRequestContext,
    RequestContext, SERVER_MODULES, ServerModuleOpts
} from '@tsdi/endpoints';
import { WsClient } from './client/client';
import { WS_CLIENT_FILTERS, WS_CLIENT_INTERCEPTORS } from './client/options';
import { WsHandler } from './client/handler';
import { WsServer } from './server/server';
import { WS_SERV_FILTERS, WS_SERV_GUARDS, WS_SERV_INTERCEPTORS } from './server/options';
import { WsEndpointHandler } from './server/handler';
import { Message, Packet, isResponseEvent } from '@tsdi/common';
import { ClientIncomingPacket, IncomingPacket, OutgoingPacket } from '@tsdi/common/transport';
import { WsMessage, WsMessageFactory } from './message';
import { WsClientIncoming, WsClientIncomingFactory, WsIncoming, WsIncomingFactory } from './incoming';
import { WsOutgoing, WsOutgoingFactory } from './outgoing';
import { WsRequest } from './client/request';


// const defaultMaxSize = 65515; //1024 * 64 - 20;
// const defaultMaxSize = 1048576; //1024 * 1024;
const defaultMaxSize = 5242880; //1024 * 1024 * 5;
// const defaultMaxSize = 10485760; //1024 * 1024 * 10;


@Module({
    providers: [
        WsClient,
        WsServer,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'ws',
                microservice: true,
                asDefault: true,
                clientType: WsClient,
                hanlderType: WsHandler,
                defaultOpts: {
                    url: 'ws://localhost:3000',
                    interceptorsToken: WS_CLIENT_INTERCEPTORS,
                    filtersToken: WS_CLIENT_FILTERS,
                    messageFactory: WsMessageFactory,
                    incomingFactory: WsClientIncomingFactory,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof WsMessage, [[WsRequest, Packet]]) },
                        decodingsAdapter: { useValue: new CustomCodingsAdapter(isResponseEvent, [[WsClientIncoming, ClientIncomingPacket], [WsMessage, Message]]) },
                    }
                }
            } as ClientModuleOpts,
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'ws',
                microservice: true,
                asDefault: true,
                serverType: WsServer,
                handlerType: WsEndpointHandler,
                defaultOpts: {
                    transportOpts: {
                        delimiter: '#',
                        defaultMethod: '*',
                        maxSize: defaultMaxSize,
                        decodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof RequestContext, [[WsIncoming, IncomingPacket], [WsMessage, Message]]) },
                        encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof WsMessage, [[PatternRequestContext, RequestContext], [WsOutgoing, OutgoingPacket]]) },
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: false,
                    interceptorsToken: WS_SERV_INTERCEPTORS,
                    filtersToken: WS_SERV_FILTERS,
                    guardsToken: WS_SERV_GUARDS,
                    messageFactory: WsMessageFactory,
                    incomingFactory: WsIncomingFactory,
                    outgoingFactory: WsOutgoingFactory,
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
export class WsModule {

}
