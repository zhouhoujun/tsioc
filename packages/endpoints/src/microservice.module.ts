import { Arrayify, EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, TypeOf, isArray, toProvider } from '@tsdi/ioc';
import { TransformModule } from '@tsdi/core';
import { NotImplementedExecption, PatternFormatter, Transport, TransportOpts, TransportRequired, TransportSessionFactory } from '@tsdi/common';
import { EndpointModule } from './endpoint.module';

import { TransportEndpoint, TransportEndpointOptions, createTransportEndpoint } from './TransportEndpoint';
import { TransportContext } from './TransportContext';
import { SessionOptions } from './middleware/session';
import { Server } from './Server';
import { MicroServRouterModule, createMicroRouteProviders } from './router/router.module';
import { RouteMatcher } from './router/router';
import { Routes } from './router/route';
import { SHOW_DETAIL_ERROR } from './execption.handlers';
import { Responder } from './Responder';




export interface MicroServiceOpts<TSerOpts = any> extends TransportEndpointOptions<TransportContext> {
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
    detailError?: boolean;
    routes?: {
        matcher?: TypeOf<RouteMatcher>;
        formatter?: TypeOf<PatternFormatter>;
        prefix?: string;
        routes?: Routes;
    }
}


export interface MicroServiceModuleConfig {
    /**
     * server provdier.
     */
    server?: ProvdierOf<Server>;
    /**
     * micro service endpoint provider
     */
    endpoint?: ProvdierOf<TransportEndpoint>;
    /**
     * micro service transport session factory.
     */
    sessionFactory?: ProvdierOf<TransportSessionFactory>;
    /**
     * micro service options
     */
    serverOpts?: MicroServiceOpts;
    /**
     * micro service default options.
     */
    defaultOpts?: MicroServiceOpts;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];
}

export interface MicroServiceModuleOpts extends MicroServiceModuleConfig {
    /**
     * server type.
     */
    serverType: Type<Server>;
    /**
     * server options token.
     */
    serverOptsToken: Token<MicroServiceOpts>;
    /**
     * micro service endpoint type
     */
    endpointType: Type<TransportEndpoint>;
    /**
     * micro service transport session factory type.
     */
    sessionFactoryType?: Type<TransportSessionFactory>;
}



const micros: Record<string, MicroServiceModuleOpts> = {};


export interface MicroServiceImpl {
    /**
     * set microservice client implement options.
     * @param transport 
     * @param options 
     * @returns 
     */
    setMicroservice(transport: Transport, options: MicroServiceModuleOpts): MicroServiceImpl;
}

export const MICROSERVICE_IMPL: MicroServiceImpl = {
    setMicroservice(transport: Transport, options: MicroServiceModuleOpts): MicroServiceImpl {
        micros[transport] = options;
        return MICROSERVICE_IMPL;
    }
}


@Module({
    imports: [
        TransformModule,
        EndpointModule,
        MicroServRouterModule
    ]
})
export class MicroServiceModule {

    static forMicroservice(options: MicroServiceModuleConfig & TransportRequired): ModuleWithProviders<MicroServiceModule>;
    static forMicroservice(options: Array<MicroServiceModuleConfig & TransportRequired>): ModuleWithProviders<MicroServiceModule>;
    static forMicroservice(options: Arrayify<MicroServiceModuleConfig & TransportRequired>): ModuleWithProviders<MicroServiceModule> {

        let providers: ProviderType[];
        if (isArray(options)) {
            providers = []
            options.forEach(op => {
                const opts = micros[op.transport];
                if (!opts) throw new NotImplementedExecption(op.transport + ' microservice has not implemented');
                providers.push(...createServiceProviders({ ...opts, ...op }));
            })
        } else {
            const opts = micros[options.transport];
            if (!opts) throw new NotImplementedExecption(options.transport + ' microservice has not implemented');
            providers = createServiceProviders({ ...opts, ...options });
        }

        return {
            providers,
            module: MicroServiceModule
        }
    }
}


function createServiceProviders(options: MicroServiceModuleOpts & TransportRequired) {
    const { transport, serverType, endpointType, serverOptsToken, defaultOpts, sessionFactoryType } = options;
    const serverOpts = {
        backend: MicroServRouterModule.getToken(transport),
        ...defaultOpts,
        ...options.serverOpts,
        providers: [...defaultOpts?.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
    };

    if (serverOpts.detailError) {
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
        },
        ...createMicroRouteProviders(transport, serverOpts.routes)
    ];

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
            useFactory: (injector: Injector, opts: MicroServiceOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, serverOptsToken]
        })
    }

    if (options.sessionFactory) {
        providers.push(toProvider(sessionFactoryType ?? TransportSessionFactory, options.sessionFactory))
    } else if (sessionFactoryType) {
        providers.push(sessionFactoryType);
    }

    return providers
}
