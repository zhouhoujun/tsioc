import { AbstractRequest, PatternFormatter, RequestHandler } from '@tsdi/common';
// import { TransportConfigure } from '@tsdi/common/transport';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { Token, AbstractType } from '@tsdi/ioc';
import { RequestBackend } from './backend';

/**
 * Client options.
 */
export interface ClientConfig<TConnOpts = any> extends ConfigableHandlerOptions<AbstractRequest<any>> {
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
    backend?: Token<RequestBackend> | RequestBackend;

    formatter?: Token<PatternFormatter>;
}
