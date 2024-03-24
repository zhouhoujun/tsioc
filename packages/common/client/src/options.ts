import { Token } from '@tsdi/ioc';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { TransportRequest } from '@tsdi/common';
import { TransportBackend } from './backend';
import { TransportOpts } from '@tsdi/common/transport';

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
     * timeout
     */
    timeout?: number;
    /**
     * transport options.
     */
    transportOpts?: TransportOpts;
    /**
     * transport backend.
     */
    backend?: Token<TransportBackend> | TransportBackend;
}
