import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { Message, Packet, PatternFormatter, isResponseEvent } from '@tsdi/common';
import { CLIENT_MODULES, ClientModuleOpts } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, PatternRequestContext, RequestContext, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { RedisClient } from './client/client';
import { REDIS_CLIENT_FILTERS, REDIS_CLIENT_INTERCEPTORS } from './client/options';
import { RedisHandler } from './client/handler';
import { RedisServer } from './server/server';
import { REDIS_SERV_FILTERS, REDIS_SERV_GUARDS, REDIS_SERV_INTERCEPTORS } from './server/options';
import { RedisEndpointHandler } from './server/handler';
import { RedisPatternFormatter } from './pattern';
// import { RedisTransportSessionFactory } from './redis.session';
import { RedisMessage, RedisMessageFactory, RedisMessageReader, RedisMessageWriter } from './message';
import { RedisClientIncoming, RedisClientIncomingFactory, RedisIncoming, RedisIncomingFactory } from './incoming';
import { RedisOutgoing, RedisOutgoingFactory } from './outgoing';
import { ClientIncomingPacket, IncomingPacket, OutgoingPacket } from '@tsdi/common/transport';
import { RedisRequest } from './client/request';


const defaultMaxSize = 1048576; //1024 * 1024;

@Module({
    providers: [
        RedisClient,
        RedisServer,
        RedisPatternFormatter,
        // RedisTransportSessionFactory,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'redis',
                microservice: true,
                clientType: RedisClient,
                hanlderType: RedisHandler,
                messageReader: RedisMessageReader,
                messageWriter: RedisMessageWriter,
                messageFactory: RedisMessageFactory,
                incomingFactory: RedisClientIncomingFactory,
                defaultOpts: {
                    encoding: 'utf8',
                    interceptorsToken: REDIS_CLIENT_INTERCEPTORS,
                    filtersToken: REDIS_CLIENT_FILTERS,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        defaultMethod: '*',
                        encodings: {
                            end: RedisMessage,
                            defaults: [
                                [RedisRequest, Packet]
                            ]
                        },
                        decodings: {
                            complete: isResponseEvent,
                            defaults: [
                                [RedisClientIncoming, ClientIncomingPacket],
                                [RedisMessage, Message]
                            ]
                        }
                    },
                    providers: [{ provide: PatternFormatter, useExisting: RedisPatternFormatter }]
                }
            } as ClientModuleOpts,
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'redis',
                microservice: true,
                serverType: RedisServer,
                handlerType: RedisEndpointHandler,
                defaultOpts: {
                    encoding: 'utf8',
                    messageReader: RedisMessageReader,
                    messageWriter: RedisMessageWriter,
                    messageFactory: RedisMessageFactory,
                    incomingFactory: RedisIncomingFactory,
                    outgoingFactory: RedisOutgoingFactory,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        defaultMethod: '*',
                        decodings: {
                            end: RequestContext,
                            defaults: [
                                [RedisIncoming, IncomingPacket],
                                [RedisMessage, Message]
                            ]
                        },
                        encodings: {
                            end: RedisMessage,
                            defaults: [
                                [PatternRequestContext, RequestContext],
                                [RedisOutgoing, OutgoingPacket]
                            ]
                        }
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: true,
                    interceptorsToken: REDIS_SERV_INTERCEPTORS,
                    filtersToken: REDIS_SERV_FILTERS,
                    guardsToken: REDIS_SERV_GUARDS,
                    // sessionFactory: { useExisting: RedisTransportSessionFactory },
                    interceptors: [
                        LoggerInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
                    ],
                    routes: {
                        formatter: RedisPatternFormatter
                    }
                }
            } as ServerModuleOpts,
            multi: true
        }
    ]
})
export class RedisModule {

}
