import { Module } from '@tsdi/ioc';
import { AmqpClient } from './client/client';
import { AmqpServer } from './server/server';
import { AmqpConfiguration } from './configuration';



// const defaultMaxSize = 1048576; // 1024 * 1024;
// const defaultMaxSize = 262144; // 1024 * 256;

@Module({
    providers: [
        AmqpClient,
        AmqpServer,
        AmqpConfiguration,
        // {
        //     provide: CLIENT_MODULES,
        //     useValue: {
        //         transport: 'amqp',
        //         clientType: AmqpClient,
        //         hanlderType: AmqpHandler,
        //         defaultOpts: {
        //             interceptorsToken: AMQP_CLIENT_INTERCEPTORS,
        //             filtersToken: AMQP_CLIENT_FILTERS,
        //             connectOpts: 'amqp://localhost',
        //             transportOpts: {
        //                 queue: 'amqp.queue',
        //                 replyQueue: 'amqp.queue.reply',
        //                 persistent: false,
        //                 noAssert: false,
        //                 queueOpts: {},
        //                 prefetchCount: 0,
        //             },
        //             // sessionFactory: { useExisting: AmqpServerTransportFactory }
        //         }
        //     } as ClientModuleOpts,
        //     multi: true
        // },
        // {
        //     provide: SERVER_MODULES,
        //     useValue: {
        //         transport: 'amqp',
        //         microservice: true,
        //         serverType: AmqpServer,
        //         handlerType: AmqpRequestHandler,
        //         defaultOpts: {
        //             serverOpts: 'amqp://localhost',
        //             transportOpts: {
        //                 queue: 'amqp.queue',
        //                 replyQueue: 'amqp.queue.reply',
        //                 serverSide: true,
        //                 delimiter: '#',
        //                 maxSize: defaultMaxSize,
        //                 persistent: false,
        //                 noAssert: false,
        //                 queueOpts: {},
        //                 prefetchCount: 0
        //             },
        //             content: {
        //                 root: 'public',
        //                 prefix: 'content'
        //             },
        //             detailError: true,
        //             interceptorsToken: AMQP_SERV_INTERCEPTORS,
        //             filtersToken: AMQP_SERV_FILTERS,
        //             guardsToken: AMQP_SERV_GUARDS,
        //             // sessionFactory: { useExisting: AmqpServerTransportFactory },
        //             filters: [
        //                 LoggerInterceptor,
        //                 ExecptionFinalizeFilter,
        //                 ExecptionHandlerFilter,
        //                 FinalizeFilter
        //             ]
        //         }
        //     } as ServerModuleOpts,
        //     multi: true
        // }
    ]
})
export class AmqpModule {

}