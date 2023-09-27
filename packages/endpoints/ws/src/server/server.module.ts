// import { ExecptionHandlerFilter } from '@tsdi/core';
// import {
//     ExecptionFinalizeFilter, LogInterceptor, FinalizeFilter, Session, MICROSERVICE_IMPL, StatusVaildator, defaultMaxSize, DuplexTransportSessionFactory
// } from '@tsdi/endpoints';
// import { Bodyparser, Content, Json } from '@tsdi/endpoints/assets';
// import { WS_SERV_INTERCEPTORS, WsServerOpts, WS_SERV_FILTERS, WS_SERV_OPTS, WS_SERV_GUARDS } from './options';
// import { WsServer } from './server';
// import { WsEndpoint } from './endpoint';
// import { WsStatusVaildator } from '../status';




// /**
//  * ws microservice default options.
//  */
// const defMicroOpts = {
//     transportOpts: {
//         delimiter: '#',
//         maxSize: defaultMaxSize
//     },
//     content: {
//         root: 'public',
//         prefix: 'content'
//     },
//     detailError: true,
//     interceptorsToken: WS_SERV_INTERCEPTORS,
//     filtersToken: WS_SERV_FILTERS,
//     guardsToken: WS_SERV_GUARDS,
//     sessionFactory: DuplexTransportSessionFactory,
//     filters: [
//         LogInterceptor,
//         ExecptionFinalizeFilter,
//         ExecptionHandlerFilter,
//         FinalizeFilter
//     ],
//     interceptors: [
//         Session,
//         Content,
//         Json,
//         Bodyparser
//     ],
//     providers: [
//         { provide: StatusVaildator, useExisting: WsStatusVaildator }
//     ]

// } as WsServerOpts;


// MICROSERVICE_IMPL.setMicroservice('ws', {
//     serverType: WsServer,
//     serverOptsToken: WS_SERV_OPTS,
//     endpointType: WsEndpoint,
//     defaultOpts: defMicroOpts
// });



// // /**
// //  * WS microservice Module.
// //  */
// // @Module({
// //     imports: [
// //         TransformModule,
// //         MicroServRouterModule.forRoot('ws'),
// //         ServerEndpointModule
// //     ],
// //     providers: [
// //         { provide: TransportSessionFactory, useClass: WsTransportSessionFactory, asDefault: true },
// //         { provide: WS_SERV_OPTS, useValue: { ...defMicroOpts }, asDefault: true },
// //         WsStatusVaildator,
// //         WsExecptionHandlers,
// //         {
// //             provide: WsEndpoint,
// //             useFactory: (injector: Injector, opts: WsServerOpts) => {
// //                 return createTransportEndpoint(injector, opts)
// //             },
// //             asDefault: true,
// //             deps: [Injector, WS_SERV_OPTS]
// //         },
// //         WsServer
// //     ]
// // })
// // export class WsMicroServModule {
// //     /**
// //      * import tcp micro service module with options.
// //      * @param options micro service module options.
// //      * @returns 
// //      */
// //     static withOptions(options: {
// //         /**
// //          * service endpoint provider
// //          */
// //         endpoint?: ProvdierOf<WsEndpoint>;
// //         /**
// //          * transport session factory.
// //          */
// //         transportFactory?: ProvdierOf<WsTransportSessionFactory>;
// //         /**
// //          * server options
// //          */
// //         serverOpts?: WsServerOpts;
// //         /**
// //          * custom provider with module.
// //          */
// //         providers?: ProviderType[];
// //     }): ModuleWithProviders<WsMicroServModule> {
// //         const providers: ProviderType[] = [
// //             ...options.providers ?? EMPTY,
// //             {
// //                 provide: WS_SERV_OPTS,
// //                 useValue: {
// //                     ...defMicroOpts,
// //                     ...options.serverOpts,
// //                     providers: [...defMicroOpts.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
// //                 }
// //             }
// //         ];

// //         if (options.endpoint) {
// //             providers.push(toProvider(WsEndpoint, options.endpoint))
// //         }
// //         if (options.transportFactory) {
// //             providers.push(toProvider(TransportSessionFactory, options.transportFactory))
// //         }
// //         return {
// //             module: WsMicroServModule,
// //             providers
// //         }
// //     }

// // }


