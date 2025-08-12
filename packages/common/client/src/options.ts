import { AbstractRequest, PatternFormatter } from '@tsdi/common';
import { TransportConfigure } from '@tsdi/common/transport';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { ProvdierOf, Token, AbstractType } from '@tsdi/ioc';
import { ClientBackend } from './backend';
import { ClientTransportFactory } from './transport/transport';
import { ClientHandler } from './handler';


/**
 * Client options.
 */
export interface ClientConfig<TConnOpts = any> extends ConfigableHandlerOptions<AbstractRequest<any>>, TransportConfigure {
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
     * protocol
     */
    protocol?: string;
    /**
     * client handler type.
     */
    handlerType?: AbstractType<ClientHandler>;
    /**
     * service transport factory.
     */
    transportFactory?: ProvdierOf<ClientTransportFactory>;

    /**
     * transport backend.
     */
    backend?: Token<ClientBackend> | ClientBackend;

    formatter?: Token<PatternFormatter>;
}
