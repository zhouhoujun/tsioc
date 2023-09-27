import { ProvdierOf, Token } from '@tsdi/ioc';
import { ConfigableEndpointOptions } from '@tsdi/core';
import { TransportOpts, TransportRequest, TransportSessionFactory } from '@tsdi/common';
import { Client } from './Client';


export interface ClientOpts<TConnOpts = any> extends ConfigableEndpointOptions<TransportRequest> {
    client?: Token<Client>;
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
