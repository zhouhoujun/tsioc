import { Module } from '@tsdi/ioc';
import { KafkaClient } from './client/client';
import { KafkaServer } from './server/server';
import { KafkaPatternFormatter, KafkaRouteMatcher } from './pattern';
import { KafkaConfiguration } from './configuration';



@Module({
    providers: [
        KafkaClient,
        KafkaServer,
        KafkaPatternFormatter,
        KafkaRouteMatcher,
        KafkaConfiguration
        // {
        //     provide: CLIENT_MODULES,
        //     useValue: {
        //         transport: 'kafka',
        //         clientType: KafkaClient,
        //         hanlderType: KafkaHandler,
        //         defaultOpts: {
        //             encoding: 'utf8',
        //             interceptorsToken: KAFKA_CLIENT_INTERCEPTORS,
        //             filtersToken: KAFKA_CLIENT_FILTERS,
        //             transportOpts: {
        //                 delimiter: '#',
        //                 maxSize: defaultMaxSize,
        //             },
        //             // sessionFactory: { useExisting: KafkaServerTransportFactory },
        //             providers: [{ provide: PatternFormatter, useExisting: KafkaPatternFormatter }]
        //         }
        //     } as ClientModuleOpts,
        //     multi: true
        // },
        // {
        //     provide: SERVER_MODULES,
        //     useValue: {
        //         transport: 'kafka',
        //         microservice: true,
        //         serverType: KafkaServer,
        //         handlerType: KafkaRequestHandler,
        //         defaultOpts: {
        //             encoding: 'utf8',
        //             transportOpts: {
        //                 serverSide: true,
        //                 delimiter: '#',
        //                 maxSize: defaultMaxSize,
        //             },
        //             content: {
        //                 root: 'public',
        //                 prefix: 'content'
        //             },
        //             detailError: true,
        //             interceptorsToken: KAFKA_SERV_INTERCEPTORS,
        //             filtersToken: KAFKA_SERV_FILTERS,
        //             guardsToken: KAFKA_SERV_GUARDS,
        //             // sessionFactory: { useExisting: KafkaServerTransportFactory },
        //             filters: [
        //                 LoggerInterceptor,
        //                 ExceptionFinalizeFilter,
        //                 ExceptionHandlerFilter,
        //                 FinalizeFilter
        //             ],
        //             routes: {
        //                 formatter: KafkaPatternFormatter,
        //                 matcher: KafkaRouteMatcher
        //             }
        //         }
        //     } as ServerModuleOpts,
        //     multi: true
        // }
    ]
})
export class KafkaModule {

}
