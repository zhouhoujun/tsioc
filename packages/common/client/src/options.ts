import { ProvdierOf } from '@tsdi/ioc';
import { ConfigableEndpointOptions } from '@tsdi/core';
import { TransportOpts, TransportRequest, TransportSessionFactory } from '@tsdi/common';


export interface ClientOpts<TConnOpts = any> extends ConfigableEndpointOptions<TransportRequest> {
    /**
     * url
     */
    url?: string;
    connectOpts?: TConnOpts;
    transportOpts?: TransportOpts;
    timeout?: number;
    /**
     * session factory
     */
    sessionFactory?: ProvdierOf<TransportSessionFactory>;
}
