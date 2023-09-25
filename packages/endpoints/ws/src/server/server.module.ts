import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { ExecptionHandlerFilter, TransformModule } from '@tsdi/core';
import { TransportSessionFactory } from '@tsdi/common';
import {
    MicroServRouterModule, ExecptionFinalizeFilter, LogInterceptor, FinalizeFilter, Session, MICROSERVICE_IMPL
} from '@tsdi/endpoints';
import { Bodyparser, Content, Json, StatusVaildator } from '@tsdi/endpoints/assets';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { WS_SERV_INTERCEPTORS, WsServerOpts, WS_SERV_FILTERS, WS_SERV_OPTS, WS_SERV_GUARDS } from './options';
import { WsServer } from './server';
import { WsEndpoint } from './endpoint';
import { WsExecptionHandlers } from './execption.handles';
import { WsStatusVaildator } from '../status';
import { WsTransportSessionFactory, defaultMaxSize } from '../factory';




/**
 * ws microservice default options.
 */
const defMicroOpts = {
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
    backend: MicroServRouterModule.getToken('ws'),
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        FinalizeFilter
    ],
    interceptors: [
        Session,
        Content,
        Json,
        Bodyparser
    ],
    providers: [
        { provide: StatusVaildator, useExisting: WsStatusVaildator }
    ]

} as WsServerOpts;


MICROSERVICE_IMPL.setMicroservice('ws', {
    serverType: WsServer,
    serverOptsToken: WS_SERV_OPTS,
    endpointType: WsEndpoint,
    defaultOpts: defMicroOpts,
    sessionFactoryType: WsTransportSessionFactory
});



// /**
//  * WS microservice Module.
//  */
// @Module({
//     imports: [
//         TransformModule,
//         MicroServRouterModule.forRoot('ws'),
//         ServerEndpointModule
//     ],
//     providers: [
//         { provide: TransportSessionFactory, useClass: WsTransportSessionFactory, asDefault: true },
//         { provide: WS_SERV_OPTS, useValue: { ...defMicroOpts }, asDefault: true },
//         WsStatusVaildator,
//         WsExecptionHandlers,
//         {
//             provide: WsEndpoint,
//             useFactory: (injector: Injector, opts: WsServerOpts) => {
//                 return createTransportEndpoint(injector, opts)
//             },
//             asDefault: true,
//             deps: [Injector, WS_SERV_OPTS]
//         },
//         WsServer
//     ]
// })
// export class WsMicroServModule {
//     /**
//      * import tcp micro service module with options.
//      * @param options micro service module options.
//      * @returns 
//      */
//     static withOptions(options: {
//         /**
//          * service endpoint provider
//          */
//         endpoint?: ProvdierOf<WsEndpoint>;
//         /**
//          * transport session factory.
//          */
//         transportFactory?: ProvdierOf<WsTransportSessionFactory>;
//         /**
//          * server options
//          */
//         serverOpts?: WsServerOpts;
//         /**
//          * custom provider with module.
//          */
//         providers?: ProviderType[];
//     }): ModuleWithProviders<WsMicroServModule> {
//         const providers: ProviderType[] = [
//             ...options.providers ?? EMPTY,
//             {
//                 provide: WS_SERV_OPTS,
//                 useValue: {
//                     ...defMicroOpts,
//                     ...options.serverOpts,
//                     providers: [...defMicroOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
//                 }
//             }
//         ];

//         if (options.endpoint) {
//             providers.push(toProvider(WsEndpoint, options.endpoint))
//         }
//         if (options.transportFactory) {
//             providers.push(toProvider(TransportSessionFactory, options.transportFactory))
//         }
//         return {
//             module: WsMicroServModule,
//             providers
//         }
//     }

// }


