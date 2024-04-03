import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { CLIENT_MODULES, ClientDuplexTransportSessionFactory, ClientOpts } from '@tsdi/common/client';
import { DuplexTransportSessionFactory, ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { WsClient } from './client/client';
import { WS_CLIENT_FILTERS, WS_CLIENT_INTERCEPTORS } from './client/options';
import { WsHandler } from './client/handler';
import { WsServer } from './server/server';
import { WS_SERV_FILTERS, WS_SERV_GUARDS, WS_SERV_INTERCEPTORS } from './server/options';
import { WsEndpointHandler } from './server/handler';


// const defaultMaxSize = 65515; //1024 * 64 - 20;
const defaultMaxSize = 1048576; //1024 * 1024;

@Module({
    providers: [
        WsClient,
        WsServer,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'ws',
                clientType: WsClient,
                hanlderType: WsHandler,
                defaultOpts: {
                    url: 'ws://localhost:3000',
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize                     
                    },
                    interceptorsToken: WS_CLIENT_INTERCEPTORS,
                    filtersToken: WS_CLIENT_FILTERS,
                    sessionFactory: { useExisting: ClientDuplexTransportSessionFactory },
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'ws',
                microservice: true,
                serverType: WsServer,
                handlerType: WsEndpointHandler,
                defaultOpts: {
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: true,
                    interceptorsToken: WS_SERV_INTERCEPTORS,
                    filtersToken: WS_SERV_FILTERS,
                    guardsToken: WS_SERV_GUARDS,
                    sessionFactory: { useExisting: DuplexTransportSessionFactory },
                    filters: [
                        LoggerInterceptor,
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
export class WsModule {

}
