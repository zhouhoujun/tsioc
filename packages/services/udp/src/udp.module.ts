import { Message, Packet, isResponseEvent } from '@tsdi/common';
import { CustomCodingsAdapter } from '@tsdi/common/codings';
import { CLIENT_MODULES, ClientModuleOpts } from '@tsdi/common/client';
import { ClientIncomingPacket, IncomingPacket, OutgoingPacket } from '@tsdi/common/transport';
import { ExecptionHandlerFilter } from '@tsdi/core';
import {
    ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor,
    PatternRequestContext, RequestContext, SERVER_MODULES, ServerModuleOpts
} from '@tsdi/endpoints';
import { Module } from '@tsdi/ioc';
import { UdpClient } from './client/client';
import { UdpHandler } from './client/handler';
import { UDP_CLIENT_FILTERS, UDP_CLIENT_INTERCEPTORS } from './client/options';
import { UdpRequest } from './client/request';
import { defaultMaxSize } from './consts';
import { UdpClientIncoming, UdpClientIncomingFactory, UdpIncoming, UdpIncomingFactory } from './incoming';
import { UdpMessage, UdpMessageFactory, UdpMessageReader, UdpMessageWriter } from './message';
import { UdpOutgoing, UdpOutgoingFactory } from './outgoing';
import { UdpRequestHandler } from './server/handler';
import { UDP_SERV_FILTERS, UDP_SERV_GUARDS, UDP_SERV_INTERCEPTORS } from './server/options';
import { UdpServer } from './server/server';



@Module({
    providers: [
        UdpClient,
        UdpServer,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'udp',
                microservice: true,
                clientType: UdpClient,
                hanlderType: UdpHandler,
                defaultOpts: {
                    url: 'udp://localhost:3000',
                    interceptorsToken: UDP_CLIENT_INTERCEPTORS,
                    filtersToken: UDP_CLIENT_FILTERS,
                    messageReader: UdpMessageReader,
                    messageWriter: UdpMessageWriter,
                    messageFactory: UdpMessageFactory,
                    incomingFactory: UdpClientIncomingFactory,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        defaultMethod: '*',
                        serializeIgnores: ['remoteInfo'],
                        encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof UdpMessage, [[UdpRequest, Packet]]) },
                        decodingsAdapter: { useValue: new CustomCodingsAdapter(isResponseEvent, [[UdpClientIncoming, ClientIncomingPacket], [UdpMessage, Message]]) },
                    }
                }
            } as ClientModuleOpts,
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'udp',
                microservice: true,
                serverType: UdpServer,
                handlerType: UdpRequestHandler,
                defaultOpts: {
                    messageReader: UdpMessageReader,
                    messageWriter: UdpMessageWriter,
                    messageFactory: UdpMessageFactory,
                    incomingFactory: UdpIncomingFactory,
                    outgoingFactory: UdpOutgoingFactory,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        defaultMethod: '*',
                        serializeIgnores: ['remoteInfo'],
                        decodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof RequestContext, [[UdpIncoming, IncomingPacket], [UdpMessage, Message]]) },
                        encodingsAdapter: { useValue: new CustomCodingsAdapter(data => data instanceof UdpMessage, [[PatternRequestContext, RequestContext], [UdpOutgoing, OutgoingPacket]]) },
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: false,
                    interceptorsToken: UDP_SERV_INTERCEPTORS,
                    filtersToken: UDP_SERV_FILTERS,
                    guardsToken: UDP_SERV_GUARDS,
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
export class UdpModule {

}