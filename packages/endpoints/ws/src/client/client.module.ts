
import { TransportBackend, CLIENT_IMPL} from '@tsdi/common/client';
import { DuplexTransportSessionFactory, defaultMaxSize } from '@tsdi/endpoints';
import { WsClient, WsMicroClient } from './client';
import { WS_CLIENT_FILTERS, WS_CLIENT_INTERCEPTORS, WS_CLIENT_OPTS, WS_MICRO_CLIENT_FILTERS, WS_MICRO_CLIENT_INTERCEPTORS, WS_MICRO_CLIENT_OPTS, WsClientOpts, WsMicroClientOpts } from './options';
import { WsHandler, WsMicroHandler } from './handler';

/**
 * WS client default options.
 */
const defaultOpts = {
    url: 'ws://localhost:3000',
    transportOpts: {
        delimiter: '#',
        maxSize: defaultMaxSize,
    },
    interceptorsToken: WS_CLIENT_INTERCEPTORS,
    filtersToken: WS_CLIENT_FILTERS,
    backend: TransportBackend,
    sessionFactory: DuplexTransportSessionFactory
} as WsClientOpts;


CLIENT_IMPL.set('ws', {
    clientType: WsClient,
    clientOptsToken: WS_CLIENT_OPTS,
    hanlderType: WsHandler,
    defaultOpts
});


const microDefaultOpts = {
    url: 'ws://localhost:3000',
    transportOpts: {
        delimiter: '#',
        maxSize: defaultMaxSize,
    },
    interceptorsToken: WS_MICRO_CLIENT_INTERCEPTORS,
    filtersToken: WS_MICRO_CLIENT_FILTERS,
    backend: TransportBackend,
    sessionFactory: DuplexTransportSessionFactory
} as WsMicroClientOpts

CLIENT_IMPL.setMicro('ws', {
    clientType: WsMicroClient,
    clientOptsToken: WS_MICRO_CLIENT_OPTS,
    hanlderType: WsMicroHandler,
    defaultOpts: microDefaultOpts
});



// /**
//  * WS Client Module.
//  */
// @Module({
//     imports: [

//     ],
//     providers: [
//         { provide: WS_CLIENT_OPTS, useValue: { ...defClientOpts }, asDefault: true },
//         WsStatusVaildator,
//         WsTransportSessionFactory,
//         { provide: TransportSessionFactory, useExisting: WsTransportSessionFactory, asDefault: true },
//         {
//             provide: WsHandler,
//             useFactory: (injector: Injector, opts: WsClientOpts) => {
//                 if (!opts.interceptors || !opts.interceptorsToken || !opts.providers) {
//                     Object.assign(opts, defClientOpts);
//                     injector.setValue(WS_CLIENT_OPTS, opts);
//                 }
//                 return createHandler(injector, opts);
//             },
//             asDefault: true,
//             deps: [Injector, WS_CLIENT_OPTS]
//         },
//         WsClient
//     ]
// })
// export class WsClientModule {

//     /**
//      * import ws client module with options.
//      * @param options module options.
//      * @returns 
//      */
//     static withOption(options: {
//         /**
//          * client options.
//          */
//         clientOpts?: WsClientOpts | WsClientsOpts[];
//         /**
//          * client handler provider
//          */
//         handler?: ProvdierOf<WsHandler>;
//         /**
//          * session factory
//          */
//         sessionFactory?: ProvdierOf<TransportSessionFactory>;
//         /**
//          * custom provider with module.
//          */
//         providers?: ProviderType[];
//     }): ModuleWithProviders<WsClientModule> {
//         const providers: ProviderType[] = [
//             ...options.providers ?? EMPTY,
//             ...isArray(options.clientOpts) ? options.clientOpts.map(opts => ({
//                 provide: opts.client,
//                 useFactory: (injector: Injector) => {
//                     return injector.resolve(WsClient, [{ provide: WS_CLIENT_OPTS, useValue: { ...defClientOpts, ...opts, providers: [...defClientOpts.providers || EMPTY, ...opts.providers || EMPTY] } }]);
//                 },
//                 deps: [Injector]
//             }))
//                 : [{ provide: WS_CLIENT_OPTS, useValue: { ...defClientOpts, ...options.clientOpts, providers: [...defClientOpts.providers || EMPTY, ...options.clientOpts?.providers || EMPTY] } }]
//         ];

//         if (options.handler) {
//             providers.push(toProvider(WsHandler, options.handler))
//         }
//         if (options.sessionFactory) {
//             providers.push(toProvider(TransportSessionFactory, options.sessionFactory))
//         }
//         return {
//             module: WsClientModule,
//             providers
//         }
//     }


// }
