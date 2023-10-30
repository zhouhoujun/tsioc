import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { CLIENT_MODULES, ClientOpts, TransportBackend } from '@tsdi/common/client';
import { ExecptionFinalizeFilter, FinalizeFilter, LogInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { UdpClient } from './client/client';
import { UDP_CLIENT_FILTERS, UDP_CLIENT_INTERCEPTORS, UDP_CLIENT_OPTS } from './client/options';
import { UdpHandler } from './client/handler';
import { UdpServer } from './server/server';
import { UDP_SERV_FILTERS, UDP_SERV_GUARDS, UDP_SERV_INTERCEPTORS, UDP_SERV_OPTS } from './server/options';
import { UdpEndpoint } from './server/endpoint';
import { defaultMaxSize } from './consts';
import { UdpTransportSessionFactory } from './udp.session';



@Module({
    providers: [
        UdpClient,
        UdpServer,
        UdpTransportSessionFactory,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'udp',
                clientType: UdpClient,
                clientOptsToken: UDP_CLIENT_OPTS,
                hanlderType: UdpHandler,
                defaultOpts: {
                    url: 'udp://localhost:3000',
                    transportOpts: {
                        delimiter: '#',
                        maxSize: defaultMaxSize,
                    },
                    interceptorsToken: UDP_CLIENT_INTERCEPTORS,
                    filtersToken: UDP_CLIENT_FILTERS,
                    backend: TransportBackend,
                    sessionFactory: { useExisting: UdpTransportSessionFactory },
                } as ClientOpts
            },
            multi: true
        },
        {
            provide: SERVER_MODULES,
            useValue: {
                transport: 'udp',
                microservice: true,
                serverType: UdpServer,
                serverOptsToken: UDP_SERV_OPTS,
                endpointType: UdpEndpoint,
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
                    interceptorsToken: UDP_SERV_INTERCEPTORS,
                    filtersToken: UDP_SERV_FILTERS,
                    guardsToken: UDP_SERV_GUARDS,
                    sessionFactory: { useExisting: UdpTransportSessionFactory },
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
export class UdpModule {

}