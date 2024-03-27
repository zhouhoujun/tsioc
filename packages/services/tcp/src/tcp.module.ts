import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST } from '@tsdi/common';
import { CLIENT_MODULES, ClientDuplexTransportSessionFactory, ClientOpts, TransportBackend } from '@tsdi/common/client';
import { DuplexTransportSessionFactory, ExecptionFinalizeFilter, FinalizeFilter, LoggerInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { TcpClient } from './client/client';
import { TCP_CLIENT_DECODINGS, TCP_CLIENT_ENCODINGS, TCP_CLIENT_FILTERS, TCP_CLIENT_INTERCEPTORS, TCP_CLIENT_OPTS, TCP_MICROSERVICE_CLIENT_DECODINGS, TCP_MICROSERVICE_CLIENT_ENCODINGS } from './client/options';
import { TcpHandler } from './client/handler';
import { TcpServer } from './server/server';
import { TCP_MICROSERVICE_DECODINGS, TCP_MICROSERVICE_ENCODINGS, TCP_MIDDLEWARES, TCP_SERVER_DECODINGS, TCP_SERVER_ENCODINGS, TCP_SERV_FILTERS, TCP_SERV_GUARDS, TCP_SERV_INTERCEPTORS, TCP_SERV_OPTS } from './server/options';
import { TcpEndpointHandler } from './server/handler';


const defaultMaxSize = 1048576; // 1024 * 1024;
// const defaultMaxSize = 65515; //65535 - 20;
// const defaultMaxSize = 524120; // 262060; //65515 * 4;

@Module({
    providers: [
        TcpClient,
        TcpServer,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'tcp',
                clientType: TcpClient,
                microservice: true,
                clientOptsToken: TCP_CLIENT_OPTS,
                hanlderType: TcpHandler,
                defaultOpts: {
                    interceptorsToken: TCP_CLIENT_INTERCEPTORS,
                    filtersToken: TCP_CLIENT_FILTERS,
                    backend: TransportBackend,
                    transportOpts: {
                        delimiter: '#',
                        encodings: TCP_MICROSERVICE_CLIENT_ENCODINGS,
                        decodings: TCP_MICROSERVICE_CLIENT_DECODINGS,
                        maxSize: defaultMaxSize,
                    },
                    sessionFactory: { useExisting: ClientDuplexTransportSessionFactory },
                } as ClientOpts
            },
            multi: true
        },
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
                        encodings: TCP_CLIENT_ENCODINGS,
                        decodings: TCP_CLIENT_DECODINGS,
                        maxSize: defaultMaxSize,
                    },
                    sessionFactory: { useExisting: ClientDuplexTransportSessionFactory },
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
                handlerType: TcpEndpointHandler,
                defaultOpts: {
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        encodings: TCP_MICROSERVICE_ENCODINGS,
                        decodings: TCP_MICROSERVICE_DECODINGS,
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
                        LoggerInterceptor,
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
                handlerType: TcpEndpointHandler,
                defaultOpts: {
                    listenOpts: { port: 3000, host: LOCALHOST },
                    transportOpts: {
                        delimiter: '#',
                        encodings: TCP_SERVER_ENCODINGS,
                        decodings: TCP_SERVER_DECODINGS,
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
export class TcpModule {

}
