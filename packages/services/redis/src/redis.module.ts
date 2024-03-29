import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { PatternFormatter } from '@tsdi/common';
import { CLIENT_MODULES, ClientOpts } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { RedisClient } from './client/client';
import { REDIS_CLIENT_FILTERS, REDIS_CLIENT_INTERCEPTORS } from './client/options';
import { RedisHandler } from './client/handler';
import { RedisServer } from './server/server';
import { REDIS_SERV_FILTERS, REDIS_SERV_GUARDS, REDIS_SERV_INTERCEPTORS } from './server/options';
import { RedisEndpointHandler } from './server/handler';
import { RedisPatternFormatter } from './pattern';
import { RedisTransportSessionFactory } from './redis.session';


const defaultMaxSize = 1048576; //1024 * 1024;

@Module({
    providers: [
        RedisClient,
        RedisServer,
        RedisPatternFormatter,
        RedisTransportSessionFactory,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'redis',
                clientType: RedisClient,
                hanlderType: RedisHandler,
                defaultOpts: {
                    encoding: 'utf8',
                    interceptorsToken: REDIS_CLIENT_INTERCEPTORS,
                    filtersToken: REDIS_CLIENT_FILTERS,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    },
                    // sessionFactory: { useExisting: RedisTransportSessionFactory },
                    providers: [{ provide: PatternFormatter, useExisting: RedisPatternFormatter }]
                } as ClientOpts
            },
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
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
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
