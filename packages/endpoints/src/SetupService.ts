import { Injectable, Injector, ProvdierOf, ProviderType, ReflectiveRef, Token, Type, toProvider, tokenId } from '@tsdi/ioc';
import { ApplicationContext, Startup } from '@tsdi/core';
import { HybirdTransport, Transport } from '@tsdi/common';
import { Server, ServerOpts } from './Server';
import { TransportEndpoint, createTransportEndpoint } from './TransportEndpoint';
import { MiddlewareOpts, createMiddlewareEndpoint } from './middleware/middleware.endpoint';





export interface ServerConfig {
    /**
     * auto bootstrap or not. default true.
     */
    bootstrap?: boolean;
    /**
     * server provdier.
     */
    server?: ProvdierOf<Server>;
    /**
     * server endpoint provider
     */
    endpoint?: ProvdierOf<TransportEndpoint>;
    /**
     * server options
     */
    serverOpts?: ProvdierOf<ServerOpts>;
    /**
     * custom provider with module.
     */
    providers?: ProviderType[];
}


export interface HeybirdOpts {
    /**
    * heybird or not.
    */
    heybird?: boolean | HybirdTransport;
}

export interface MicroServiceOpts {
    /**
     * microservice or not.
     */
    microservice: true;
    /**
     * microservice transport.
     */
    transport: Transport;
    /**
     * server options
     */
    serverOpts?: ProvdierOf<ServerOpts & HeybirdOpts>;
}

export interface HeybirdServiceOpts {
    microservice?: false;
    transport: HybirdTransport;
    /**
     * server options
     */
    serverOpts?: ProvdierOf<ServerOpts & MiddlewareOpts>;

}

export type ServiceOpts = (ServerConfig & HeybirdServiceOpts) | (ServerConfig & MicroServiceOpts);


export const REGISTER_SERVICES = tokenId<ServiceModuleOpts[]>('REGISTER_SERVICES');


/**
 * server module options.
 */
export interface ServerModuleOpts extends ServerConfig {
    /**
     * microservice or not.
     */
    microservice?: boolean;
    /**
     * server type.
     */
    serverType: Type<Server>;
    /**
     * server options token.
     */
    serverOptsToken: Token<ServerOpts>;
    /**
     * server endpoint type
     */
    endpointType: Type<TransportEndpoint>;
    /**
     * server default options.
     */
    defaultOpts?: ServerOpts;
    /**
     * server options register as. 
     */
    registerAs?: Token<ServerOpts>;
}
export type ServiceModuleOpts = (ServerModuleOpts & HeybirdServiceOpts) | (ServerModuleOpts & MicroServiceOpts);

/**
 * global registered server modules
 */
export const SERVER_MODULES = tokenId<ServiceModuleOpts[]>('SERVER_MODULES');

/**
 * setup register services in root.
 */
@Injectable()
export class ServerSetupService {

    context!: ApplicationContext;

    private services: ReflectiveRef[] = [];
    private unboots = new Set<Type>();

    @Startup()
    protected async setup(context: ApplicationContext): Promise<any> {
        this.context = context;

        const services = context.injector.get(REGISTER_SERVICES);

        services.forEach(s => {

            const opts = s as ServiceModuleOpts & { registerAs: Token<ServerOpts> };
            const { registerAs, bootstrap, serverType, serverOptsToken, server, endpointType, endpoint, microservice } = opts;
            const providers: ProviderType[] = [
                { provide: serverOptsToken, useExisting: registerAs }
            ];
            if (server) {
                providers.push(toProvider(serverType, server));
            }

            if (endpoint) {
                providers.push(toProvider(endpointType, endpoint))
            } else {
                providers.push({
                    provide: endpointType,
                    useFactory: (injector: Injector, serverOpts: ServerOpts) => {
                        return (!microservice && serverOpts.middlewaresToken && serverOpts.middlewares) ? createMiddlewareEndpoint(injector, serverOpts) : createTransportEndpoint(injector, serverOpts)
                    },
                    asDefault: true,
                    deps: [Injector, registerAs]
                })
            }

            if (bootstrap === false) {
                this.unboots.add(serverType);
            }
            this.services.push(context.runners.attach(serverType, { limit: 1, bootstrap, providers }));
        })

    }

    getServices(): ReflectiveRef[] {
        return this.services;
    }

    async run(): Promise<void> {
        if (!this.unboots.size) return;
        await Promise.all(Array.from(this.unboots.values()).map(ty => this.context.runners.run()));
    }

}