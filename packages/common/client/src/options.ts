import { Token, AbstractType } from '@tsdi/ioc';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { AbstractRequest, PatternFormatter, RequestHandler } from '@tsdi/common';
import { ClientBackend } from './handler';

/**
 * Client options.
 */
export interface ClientConfig<TConnOpts = any> extends ConfigableHandlerOptions<AbstractRequest<any>> {
    name?: string;
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
    handlerType?: AbstractType<RequestHandler>;

    /**
     * transport backend.
     */
    backend?: Token<ClientBackend> | ClientBackend;

    formatter?: Token<PatternFormatter>;
}
