import { Injectable, ProvdierOf, ProviderType, Token, Type, tokenId } from '@tsdi/ioc';
import { ApplicationContext, Startup } from '@tsdi/core';
import { HybirdTransport, Transport } from '@tsdi/common';
import { Server, ServerOpts } from './Server';
import { TransportEndpoint } from './TransportEndpoint';
import { MiddlewareOpts } from './middleware/middleware.endpoint';




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

    @Startup({ order: 0 })
    async setup(context: ApplicationContext): Promise<any> {

        const services = context.injector.get(REGISTER_SERVICES);

        services.forEach(s => {

            const providers: ProviderType[] = [
                { provide: s.serverOptsToken, useValue: s.serverOpts }
            ];

            context.runners.attach(s.serverType, { providers })
        })


    }

}