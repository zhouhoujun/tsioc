import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { PatternFormatter } from '@tsdi/common';
import { CLIENT_MODULES, ClientOpts, TopicTransportBackend } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LogInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { RedisClient } from './client/client';
import { REDIS_CLIENT_FILTERS, REDIS_CLIENT_INTERCEPTORS, REDIS_CLIENT_OPTS } from './client/options';
import { RedisHandler } from './client/handler';
import { RedisServer } from './server/server';
import { REDIS_SERV_FILTERS, REDIS_SERV_GUARDS, REDIS_SERV_INTERCEPTORS, REDIS_SERV_OPTS } from './server/options';
import { RedisEndpoint } from './server/endpoint';
import { RedisPatternFormatter } from './pattern';
import { RedisTransportSessionFactory } from './redis.session';


const defaultMaxSize = 1024 * 256;

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
                clientOptsToken: REDIS_CLIENT_OPTS,
                hanlderType: RedisHandler,
                defaultOpts: {
                    encoding: 'utf8',
                    interceptorsToken: REDIS_CLIENT_INTERCEPTORS,
                    filtersToken: REDIS_CLIENT_FILTERS,
                    backend: TopicTransportBackend,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    },
                    sessionFactory: { useExisting: RedisTransportSessionFactory },
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
                serverOptsToken: REDIS_SERV_OPTS,
                endpointType: RedisEndpoint,
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
                    interceptorsToken: REDIS_SERV_INTERCEPTORS,
                    filtersToken: REDIS_SERV_FILTERS,
                    guardsToken: REDIS_SERV_GUARDS,
                    sessionFactory: { useExisting: RedisTransportSessionFactory },
                    filters: [
                        LogInterceptor,
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
