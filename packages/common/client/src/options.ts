import { Token } from '@tsdi/ioc';
import { ConfigableEndpointOptions } from '@tsdi/core';
import { TransportRequest } from '@tsdi/common';
import { TransportBackend } from './backend';

/**
 * Client options.
 */
export interface ClientOpts<TConnOpts = any> extends ConfigableEndpointOptions<TransportRequest> {
    /**
     * url
     */
    url?: string;
    /**
     * authority base url.
     */
    authority?: string;
    connectOpts?: TConnOpts;
    timeout?: number;
    backend?: Token<TransportBackend> | TransportBackend;
}
