import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { CLIENT_MODULES, ClientOpts, TopicTransportBackend } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LogInterceptor, SERVER_MODULES, ServerModuleOpts, defaultMaxSize } from '@tsdi/endpoints';
import { AmqpClient } from './client/client';
import { AMQP_CLIENT_FILTERS, AMQP_CLIENT_INTERCEPTORS, AMQP_CLIENT_OPTS } from './client/options';
import { AmqpHandler } from './client/handler';
import { AmqpTransportSessionFactory } from './amqp.session';
import { AmqpServer } from './server/server';
import { AMQP_SERV_FILTERS, AMQP_SERV_GUARDS, AMQP_SERV_INTERCEPTORS, AMQP_SERV_OPTS } from './server/options';
import { AmqpEndpoint } from './server/endpoint';




@Module({
    providers: [
        AmqpTransportSessionFactory,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'amqp',
                clientType: AmqpClient,
                clientOptsToken: AMQP_CLIENT_OPTS,
                hanlderType: AmqpHandler,
                defaultOpts: {
                    interceptorsToken: AMQP_CLIENT_INTERCEPTORS,
                    filtersToken: AMQP_CLIENT_FILTERS,
                    connectOpts: 'amqp://localhost',
                    transportOpts: {
                        queue: 'amqp.queue',
                        replyQueue: 'amqp.queue.reply',
                        persistent: false,
                        noAssert: false,
                        queueOpts: {},
                        prefetchCount: 0
                    },
                    backend: TopicTransportBackend,
                    sessionFactory: { useExisting: AmqpTransportSessionFactory }
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'amqp',
                microservice: true,
                serverType: AmqpServer,
                serverOptsToken: AMQP_SERV_OPTS,
                endpointType: AmqpEndpoint,
                defaultOpts: {
                    serverOpts: 'amqp://localhost',
                    transportOpts: {
                        queue: 'amqp.queue',
                        replyQueue: 'amqp.queue.reply',
                        serverSide: true,
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                        persistent: false,
                        noAssert: false,
                        queueOpts: {},
                        prefetchCount: 0
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: true,
                    interceptorsToken: AMQP_SERV_INTERCEPTORS,
                    filtersToken: AMQP_SERV_FILTERS,
                    guardsToken: AMQP_SERV_GUARDS,
                    sessionFactory: { useExisting: AmqpTransportSessionFactory },
                    filters: [
                        LogInterceptor,
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
export class AmqpModule {

}