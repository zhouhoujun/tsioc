import { Arrayify, EMPTY, Injector, Module, ModuleWithProviders, ProvdierOf, ProviderType, Token, Type, isArray, toProvider } from '@tsdi/ioc';
import { TransformModule } from '@tsdi/core';
import { NotImplementedExecption, Transport, TransportRequired, TransportSessionFactory } from '@tsdi/common';
import { EndpointModule } from './endpoint.module';
import { TransportEndpoint, createTransportEndpoint } from './TransportEndpoint';
import { Server, ServerOpts } from './Server';
import { MicroServRouterModule, createMicroRouteProviders } from './router/router.module';
import { SHOW_DETAIL_ERROR } from './execption.handlers';
import { Responder } from './Responder';




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
     * micro service options
     */
    serverOpts?: ServerOpts;
    /**
     * micro service default options.
     */
    defaultOpts?: ServerOpts;
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
     * micro service options token.
     */
    serverOptsToken: Token<ServerOpts>;
    /**
     * micro service endpoint type
     */
    endpointType: Type<TransportEndpoint>;
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
    const { transport, serverType, endpointType, serverOptsToken, defaultOpts } = options;
    const serverOpts = {
        backend: MicroServRouterModule.getToken(transport),
        ...defaultOpts,
        ...options.serverOpts,
        providers: [...defaultOpts?.providers || EMPTY, ...options.serverOpts?.providers || EMPTY]
    };

    if (serverOpts.sessionFactory) {
        serverOpts.providers.push(toProvider(TransportSessionFactory, serverOpts.sessionFactory))
    }

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
            useFactory: (injector: Injector, opts: ServerOpts) => {
                return createTransportEndpoint(injector, opts)
            },
            asDefault: true,
            deps: [Injector, serverOptsToken]
        })
    }

    return providers
}
