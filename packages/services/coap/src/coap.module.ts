import { Module } from '@tsdi/ioc';
import { ExecptionHandlerFilter } from '@tsdi/core';
import { LOCALHOST } from '@tsdi/common';
import { CLIENT_MODULES, ClientOpts, TransportBackend } from '@tsdi/common/client';
import { DuplexTransportSessionFactory, ExecptionFinalizeFilter, FinalizeFilter, LogInterceptor, SERVER_MODULES, ServerModuleOpts } from '@tsdi/endpoints';
import { CoapClient } from './client/client';
import { COAP_CLIENT_FILTERS, COAP_CLIENT_INTERCEPTORS, COAP_CLIENT_OPTS } from './client/options';
import { CoapHandler } from './client/handler';
import { CoapServer } from './server/server';
import { COAP_MICRO_SERV_OPTS, COAP_SERV_FILTERS, COAP_SERV_GUARDS, COAP_SERV_INTERCEPTORS, COAP_SERV_OPTS } from './server/options';
import { CoapEndpoint } from './server/endpoint';
import { CoapStatusVaildator } from './status';


const defaultMaxSize = 1024 * 256;

@Module({
    providers: [
        CoapClient,
        CoapServer,
        CoapStatusVaildator,
        {
            provide: CLIENT_MODULES,
            useValue: {
                transport: 'coap',
                clientType: CoapClient,
                clientOptsToken: COAP_CLIENT_OPTS,
                hanlderType: CoapHandler,
                defaultOpts: {
                    interceptorsToken: COAP_CLIENT_INTERCEPTORS,
                    filtersToken: COAP_CLIENT_FILTERS,
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
                transport: 'coap',
                microservice: true,
                serverType: CoapServer,
                serverOptsToken: COAP_MICRO_SERV_OPTS,
                endpointType: CoapEndpoint,
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
                    interceptorsToken: COAP_SERV_INTERCEPTORS,
                    filtersToken: COAP_SERV_FILTERS,
                    guardsToken: COAP_SERV_GUARDS,
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
                transport: 'coap',
                serverType: CoapServer,
                serverOptsToken: COAP_SERV_OPTS,
                endpointType: CoapEndpoint,
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
                    interceptorsToken: COAP_SERV_INTERCEPTORS,
                    filtersToken: COAP_SERV_FILTERS,
                    guardsToken: COAP_SERV_GUARDS,
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
export class CoapModule {

}
