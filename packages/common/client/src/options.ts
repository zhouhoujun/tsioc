import { ProvdierOf, Token } from '@tsdi/ioc';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { AbstractRequest } from '@tsdi/common';
import { ClientBackend } from './backend';
import { StatusAdapter, TransportOpts } from '@tsdi/common/transport';
import { ClientTransportSessionFactory } from './session';


/**
 * Client options.
 */
export interface ClientOpts<TConnOpts = any> extends ConfigableHandlerOptions<AbstractRequest> {
    /**
     * url
     */
    url?: string;
    /**
     * timeout
     */
    timeout?: number;
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
     * status adapter
     */
    statusAdapter?: ProvdierOf<StatusAdapter>;
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
    backend?: Token<ClientBackend> | ClientBackend;
}
