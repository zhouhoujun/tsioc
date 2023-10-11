import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST, PatternFormatter } from '@tsdi/common';
import { CLIENT_MODULES, ClientOpts, TopicTransportBackend } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LogInterceptor, SERVER_MODULES, ServerModuleOpts, defaultMaxSize } from '@tsdi/endpoints';
import { KafkaClient } from './client/client';
import { KAFKA_CLIENT_FILTERS, KAFKA_CLIENT_INTERCEPTORS, KAFKA_CLIENT_OPTS } from './client/options';
import { KafkaHandler } from './client/handler';
import { KafkaServer } from './server/server';
import { KAFKA_SERV_FILTERS, KAFKA_SERV_GUARDS, KAFKA_SERV_INTERCEPTORS, KAFKA_SERV_OPTS } from './server/options';
import { KafkaEndpoint } from './server/endpoint';
import { KafkaPatternFormatter, KafkaRouteMatcher } from './pattern';
import { KafkaTransportSessionFactory } from './kafka.session';


@Module({
    providers: [
        KafkaClient,
        KafkaServer,
        KafkaPatternFormatter,
        KafkaRouteMatcher,
        KafkaTransportSessionFactory,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'kafka',
                clientType: KafkaClient,
                clientOptsToken: KAFKA_CLIENT_OPTS,
                hanlderType: KafkaHandler,
                defaultOpts: {
                    encoding: 'utf8',
                    interceptorsToken: KAFKA_CLIENT_INTERCEPTORS,
                    filtersToken: KAFKA_CLIENT_FILTERS,
                    backend: TopicTransportBackend,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    },
                    sessionFactory: { useExisting: KafkaTransportSessionFactory },
                    providers: [{ provide: PatternFormatter, useExisting: KafkaPatternFormatter }]
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'kafka',
                microservice: true,
                serverType: KafkaServer,
                serverOptsToken: KAFKA_SERV_OPTS,
                endpointType: KafkaEndpoint,
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
                    interceptorsToken: KAFKA_SERV_INTERCEPTORS,
                    filtersToken: KAFKA_SERV_FILTERS,
                    guardsToken: KAFKA_SERV_GUARDS,
                    sessionFactory: { useExisting: KafkaTransportSessionFactory },
                    filters: [
                        LogInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
                    ],
                    routes: {
                        formatter: KafkaPatternFormatter,
                        matcher: KafkaRouteMatcher
                    }
                }
            } as ServerModuleOpts,
            multi: true
        }
    ]
})
export class KafkaModule {

}
