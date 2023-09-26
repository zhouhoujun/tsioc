import { EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, toProvider } from '@tsdi/ioc';
import { TransformModule } from '@tsdi/core';
import { NotImplementedExecption, PatternFormatter, Transport, TransportOpts, TransportRequired, TransportSessionFactory } from '@tsdi/common';
import { EndpointModule } from '../endpoint.module';
import { TransportEndpoint, TransportEndpointOptions, createTransportEndpoint } from '../TransportEndpoint';
import { TransportContext } from '../TransportContext';
import { SessionOptions } from './session';
import { MiddlewareServer } from './server';
import { RouterModule, ROUTER_PREFIX } from '../router/router.module';
import { RouteMatcher } from '../router/router';
import { ROUTES, Routes } from '../router/route';
import { HybridRouter } from '../router/router.hybrid';
import { SHOW_DETAIL_ERROR } from '../execption.handlers';
import { Responder } from '../Responder';




export interface ServerOpts<TSerOpts = any> extends TransportEndpointOptions<TransportContext> {
    /**
     * socket timeout.
     */
    timeout?: number;
    session?: boolean | SessionOptions;
    serverOpts?: TSerOpts;
    /**
     * transport session options.
     */
    transportOpts?: TransportOpts;
    server?: any;
    responder?: ProvdierOf<Responder>;    
    /**
     * server transport session factory.
     */
    sessionFactory?: ProvdierOf<TransportSessionFactory>;
    detailError?: boolean;
    routes?: {
        matcher?: ProvdierOf<RouteMatcher>;
        formatter?: ProvdierOf<PatternFormatter>;
        prefix?: string;
        routes?: Routes;
    }
}


export interface ServerModuleConfig {
    /**
     * server provdier.
     */
    server?: ProvdierOf<MiddlewareServer>;
    /**
     * server endpoint provider
     */
    endpoint?: ProvdierOf<TransportEndpoint>;
    /**
     * server options
     */
    serverOpts?: ServerOpts;
    /**
     * server default options.
     */
    defaultOpts?: ServerOpts;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];
}

export interface ServerModuleOpts extends ServerModuleConfig {
    /**
     * server type.
     */
    serverType: Type<MiddlewareServer>;
    /**
     * server options token.
     */
    serverOptsToken: Token<ServerOpts>;
    /**
     * server endpoint type
     */
    endpointType: Type<TransportEndpoint>;
}



const micros: Record<string, ServerModuleOpts> = {};


export interface ServerImpl {
    /**
     * set Server client implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    setServer(transport: Transport, options: ServerModuleOpts): ServerImpl;
}

export const SERVER_IMPL: ServerImpl = {
    setServer(transport: Transport, options: ServerModuleOpts): ServerImpl {
        micros[transport] = options;
        return SERVER_IMPL;
    }
}


@Module({
    imports: [
        TransformModule,
        EndpointModule,
        RouterModule
    ]
})
export class ServerModule {

    /**
     * main server for root.
     * @param options 
     * @returns 
     */
    static forRoot(options: ServerModuleConfig & TransportRequired): ModuleWithProviders<ServerModule> {

        const opts = micros[options.transport];
        if (!opts) throw new NotImplementedExecption(options.transport + ' Server has not implemented');
        const providers = createServProviders({ ...opts, ...options });

        return {
            providers,
            module: ServerModule
        }
    }
}


function createServProviders(options: ServerModuleOpts & TransportRequired) {
    const { serverType, endpointType, serverOptsToken, defaultOpts } = options;
    const serverOpts = {
        backend: HybridRouter,
        ...defaultOpts,
        ...options.serverOpts,
        providers: [...defaultOpts?.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
    };

    if (serverOpts.sessionFactory) {
        serverOpts.providers.push(toProvider(TransportSessionFactory, serverOpts.sessionFactory))
    }

    if(serverOpts.detailError) {
        serverOpts.providers.push({
            provide: SHOW_DETAIL_ERROR,
            useValue: true
        });
    }

    if (serverOpts.responder) {
        serverOpts.providers.push(toProvider(Responder, serverOpts.responder))
    }

    const providers: ProviderType[] = [
        ...options.providers ?? EMPTY,
        {
            provide: serverOptsToken,
            useValue: serverOpts
        }
    ];

    if (serverOpts.routes?.routes) {
        providers.push({
            provide: ROUTES,
            useValue: serverOpts.routes?.routes ?? []
        })
    }

    if (serverOpts.routes?.prefix) {
        providers.push({
            provide: ROUTER_PREFIX,
            useValue: serverOpts.routes?.prefix
        })
    }

    if (serverOpts.routes?.formatter) {
        providers.push(toProvider(PatternFormatter, serverOpts.routes?.formatter))
    }

    if (serverOpts.routes?.matcher) {
        providers.push(toProvider(RouteMatcher, serverOpts.routes?.matcher))
    }


    if (options.server) {
        providers.push(toProvider(serverType, options.server));
    } else if (serverType) {
        providers.push(serverType);
    }


    if (options.endpoint) {
        providers.push(toProvider(endpointType, options.endpoint))
    } else {
        providers.push({
            provide: endpointType,
            useFactory: (injector: Injector, opts: ServerOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, serverOptsToken]
        })
    }

    return providers
}
