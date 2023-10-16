import { Injectable, Injector, ProvdierOf, ProviderType, Token, Type, toProvider, tokenId } from '@tsdi/ioc';
import { ApplicationContext, Startup } from '@tsdi/core';
import { HybirdTransport, Transport } from '@tsdi/common';
import { Server, ServerOpts } from './Server';
import { TransportEndpoint, createTransportEndpoint } from './TransportEndpoint';
import { MiddlewareOpts, createMiddlewareEndpoint } from './middleware/middleware.endpoint';




export interface ServerConfig {
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


export interface MicroServiceOpts {
    /**
     * microservice or not.
     */
    microservice: true;
    /**
     * microservice transport.
     */
    transport: Transport;
}

export interface HeybirdServiceOpts {
    microservice?: false;
    transport: HybirdTransport;
    serverOpts?: ProvdierOf<ServerOpts & MiddlewareOpts>;

}

export type ServiceOpts = (ServerConfig & HeybirdServiceOpts) | (ServerConfig & MicroServiceOpts);


export const REGISTER_SERVICES = tokenId<ServiceModuleOpts[]>('REGISTER_SERVICES');



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
}
export type ServiceModuleOpts = (ServerModuleOpts & HeybirdServiceOpts) | (ServerModuleOpts & MicroServiceOpts);


export const SERVER_MODULES = tokenId<ServiceModuleOpts[]>('SERVER_MODULES');

/**
 * setup register services in root.
 */
@Injectable()
export class ServerSetupService {

    @Startup()
    async setup(context: ApplicationContext): Promise<any> {

        const services = context.injector.get(REGISTER_SERVICES);

        services.forEach(s => {

            const opts = s as (ServerModuleOpts & HeybirdServiceOpts) & (ServerModuleOpts & MicroServiceOpts);
            const { serverType, server, endpointType, serverOpts, endpoint, microservice, middlewaresToken, middlewares } = opts;
            const providers: ProviderType[] = [
                { provide: s.serverOptsToken, useValue: s.serverOpts }
            ];
            if (server) {
                providers.push(toProvider(serverType, server));
            }

            if (endpoint) {
                providers.push(toProvider(endpointType, endpoint))
            } else {
                providers.push({
                    provide: endpointType,
                    useFactory: (injector: Injector) => {
                        return (!microservice && middlewaresToken && middlewares) ? createMiddlewareEndpoint(injector, serverOpts) : createTransportEndpoint(injector, serverOpts)
                    },
                    asDefault: true,
                    deps: [Injector]
                })
            }


            context.runners.attach(s.serverType, { providers })
        })


    }

}