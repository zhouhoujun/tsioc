import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST, PatternFormatter } from '@tsdi/common';
import { CLIENT_MODULES, ClientOpts, TopicTransportBackend } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LogInterceptor, SERVER_MODULES, ServerModuleOpts, TopicTransportSessionFactory, defaultMaxSize } from '@tsdi/endpoints';
import { NatsClient } from './client/client';
import { NATS_CLIENT_FILTERS, NATS_CLIENT_INTERCEPTORS, NATS_CLIENT_OPTS } from './client/options';
import { NatsHandler } from './client/handler';
import { NatsServer } from './server/server';
import { NATS_SERV_FILTERS, NATS_SERV_GUARDS, NATS_SERV_INTERCEPTORS, NATS_SERV_OPTS } from './server/options';
import { NatsEndpoint } from './server/endpoint';
import { NatsPatternFormatter } from './pattern';
import { NatsTransportSessionFactory } from './nats.session';


@Module({
    providers: [
        NatsPatternFormatter,
        NatsTransportSessionFactory,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'nats',
                clientType: NatsClient,
                clientOptsToken: NATS_CLIENT_OPTS,
                hanlderType: NatsHandler,
                defaultOpts: {
                    encoding: 'utf8',
                    interceptorsToken: NATS_CLIENT_INTERCEPTORS,
                    filtersToken: NATS_CLIENT_FILTERS,
                    backend: TopicTransportBackend,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    },
                    sessionFactory: { useExisting: NatsTransportSessionFactory },
                    providers: [{ provide: PatternFormatter, useExisting: NatsPatternFormatter }]
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'nats',
                microservice: true,
                serverType: NatsServer,
                serverOptsToken: NATS_SERV_OPTS,
                endpointType: NatsEndpoint,
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
                        LogInterceptor,
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
export class NatsEndpointModule {

}
