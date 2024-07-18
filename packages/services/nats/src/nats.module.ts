import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST, PatternFormatter } from '@tsdi/common';
import { CLIENT_MODULES, ClientModuleOpts } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { NatsClient } from './client/client';
import { NATS_CLIENT_FILTERS, NATS_CLIENT_INTERCEPTORS } from './client/options';
import { NatsHandler } from './client/handler';
import { NatsServer } from './server/server';
import { NATS_SERV_FILTERS, NATS_SERV_GUARDS, NATS_SERV_INTERCEPTORS } from './server/options';
import { NatsRequestHandler } from './server/handler';
import { NatsPatternFormatter } from './pattern';
import { NatsTransportSessionFactory } from './nats.session';



const defaultMaxSize = 1048576; //1024 * 1024;
// const defaultMaxSize = 262144; // 1024 * 256;

@Module({
    providers: [
        NatsClient,
        NatsServer,
        NatsPatternFormatter,
        NatsTransportSessionFactory,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'nats',
                clientType: NatsClient,
                hanlderType: NatsHandler,
                defaultOpts: {
                    encoding: 'utf8',
                    interceptorsToken: NATS_CLIENT_INTERCEPTORS,
                    filtersToken: NATS_CLIENT_FILTERS,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    },
                    sessionFactory: { useExisting: NatsTransportSessionFactory },
                    providers: [{ provide: PatternFormatter, useExisting: NatsPatternFormatter }]
                }
            } as ClientModuleOpts,
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'nats',
                microservice: true,
                serverType: NatsServer,
                handlerType: NatsRequestHandler,
                defaultOpts: {
                    encoding: 'utf8',
                    transportOpts: {
                        serverSide: true,
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: true,
                    interceptorsToken: NATS_SERV_INTERCEPTORS,
                    filtersToken: NATS_SERV_FILTERS,
                    guardsToken: NATS_SERV_GUARDS,
                    sessionFactory: { useExisting: NatsTransportSessionFactory },
                    filters: [
                        LoggerInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
                    ],
                    routes: {
                        formatter: NatsPatternFormatter
                    }
                }
            } as ServerModuleOpts,
            multi: true
        }
    ]
})
export class NatsModule {

}
