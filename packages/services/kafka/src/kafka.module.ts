import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { PatternFormatter } from '@tsdi/common';
import { CLIENT_MODULES, ClientModuleOpts } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { KafkaClient } from './client/client';
import { KAFKA_CLIENT_FILTERS, KAFKA_CLIENT_INTERCEPTORS } from './client/options';
import { KafkaHandler } from './client/handler';
import { KafkaServer } from './server/server';
import { KAFKA_SERV_FILTERS, KAFKA_SERV_GUARDS, KAFKA_SERV_INTERCEPTORS } from './server/options';
import { KafkaRequestHandler } from './server/handler';
import { KafkaPatternFormatter, KafkaRouteMatcher } from './pattern';
import { KafkaTransportSessionFactory } from './server/kafka.session';


const defaultMaxSize = 5242880; //1024 * 1024 * 5;

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
                hanlderType: KafkaHandler,
                defaultOpts: {
                    encoding: 'utf8',
                    interceptorsToken: KAFKA_CLIENT_INTERCEPTORS,
                    filtersToken: KAFKA_CLIENT_FILTERS,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    },
                    // sessionFactory: { useExisting: KafkaTransportSessionFactory },
                    providers: [{ provide: PatternFormatter, useExisting: KafkaPatternFormatter }]
                }
            } as ClientModuleOpts,
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'kafka',
                microservice: true,
                serverType: KafkaServer,
                handlerType: KafkaRequestHandler,
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
                    // sessionFactory: { useExisting: KafkaTransportSessionFactory },
                    filters: [
                        LoggerInterceptor,
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
