import { AbstractRequest } from '@tsdi/common';
import { TransportOptions } from '@tsdi/common/transport';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { ProvdierOf, Token, Type } from '@tsdi/ioc';
import { ClientBackend } from './backend';
import { ClientTransportFactory } from './transport/transport';
import { ClientHandler } from './handler';


/**
 * Client options.
 */
export interface ClientOpts<TConnOpts = any> extends ConfigableHandlerOptions<AbstractRequest<any>> {
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
     * client handler type.
     */
    handlerType?: Type<ClientHandler>;
    
    /**
     * service transport factory.
     */
    transportFactory?: ProvdierOf<ClientTransportFactory>;
    /**
     * transport options.
     */
    transportOptions?: TransportOptions,

    /**
     * transport backend.
     */
    backend?: Token<ClientBackend> | ClientBackend;
}
