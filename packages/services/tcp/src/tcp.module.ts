import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST } from '@tsdi/common';
import { CLIENT_MODULES, ClientOpts, TransportBackend } from '@tsdi/common/client';
import { DuplexTransportSessionFactory, ExecptionFinalizeFilter, FinalizeFilter, LogInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { TcpClient } from './client/client';
import { TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS, TCP_CLIENT_OPTS } from './client/options';
import { TcpHandler } from './client/handler';
import { TcpServer } from './server/server';
import { TCP_MIDDLEWARES, TCP_SERV_FILTERS, TCP_SERV_GUARDS, TCP_SERV_INTERCEPTORS, TCP_SERV_OPTS } from './server/options';
import { TcpEndpoint } from './server/endpoint';


const defaultMaxSize = 1024 * 256;

@Module({
    providers: [
        TcpClient,
        TcpServer,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'tcp',
                clientType: TcpClient,
                clientOptsToken: TCP_CLIENT_OPTS,
                hanlderType: TcpHandler,
                defaultOpts: {
                    interceptorsToken: TCP_CLIENT_INTERCEPTORS,
                    filtersToken: TCP_CLIENT_FILTERS,
                    backend: TransportBackend,
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    },
                    sessionFactory: { useExisting: DuplexTransportSessionFactory },
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'tcp',
                microservice: true,
                serverType: TcpServer,
                serverOptsToken: TCP_SERV_OPTS,
                endpointType: TcpEndpoint,
                defaultOpts: {
                    autoListen: true,
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize
                    },
                    content: {
                        root: 'public',
                        prefix: 'content'
                    },
                    detailError: true,
                    interceptorsToken: TCP_SERV_INTERCEPTORS,
                    filtersToken: TCP_SERV_FILTERS,
                    guardsToken: TCP_SERV_GUARDS,
                    sessionFactory: { useExisting: DuplexTransportSessionFactory },
                    filters: [
                        LogInterceptor,
                        ExecptionFinalizeFilter,
                        ExecptionHandlerFilter,
                        FinalizeFilter
                    ]
                }
            } as ServerModuleOpts,
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'tcp',
                serverType: TcpServer,
                serverOptsToken: TCP_SERV_OPTS,
                endpointType: TcpEndpoint,
                defaultOpts: {
                    autoListen: true,
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize
                    },
                    content: {
                        root: 'public'
                    },
                    detailError: true,
                    interceptorsToken: TCP_SERV_INTERCEPTORS,
                    filtersToken: TCP_SERV_FILTERS,
                    guardsToken: TCP_SERV_GUARDS,
                    middlewaresToken: TCP_MIDDLEWARES,
                    sessionFactory: { useExisting: DuplexTransportSessionFactory },
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
export class TcpModule {

}
