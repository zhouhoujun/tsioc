import { ProvdierOf, Token } from '@tsdi/ioc';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { TransportRequest } from '@tsdi/common';
import { TransportBackend } from './backend';
import { TransportOpts } from '@tsdi/common/transport';
import { ClientTransportSessionFactory } from './session';

/**
 * Client options.
 */
export interface ClientOpts<TConnOpts = any> extends ConfigableHandlerOptions<TransportRequest> {
    /**
     * url
     */
    url?: string;
    /**
     * authority base url.
     */
    authority?: string;
    /**
     * connect options.
     */
    connectOpts?: TConnOpts;
    /**
     * is microservice client or not.
     */
    microservice?: boolean;
    /**
     * timeout
     */
    timeout?: number;
    /**
     * transport options.
     */
    transportOpts?: TransportOpts;
    /**
     * service transport session factory.
     */
    sessionFactory?: ProvdierOf<ClientTransportSessionFactory>;
    /**
     * transport backend.
     */
    backend?: Token<TransportBackend> | TransportBackend;
}
