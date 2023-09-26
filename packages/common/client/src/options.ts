import { ProvdierOf, Token, Type } from '@tsdi/ioc';
import { ConfigableEndpointOptions } from '@tsdi/core';
import { RequestPacket, TransportOpts, TransportRequest, TransportSessionFactory } from '@tsdi/common';
import { Client, MicroClient } from './Client';


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


export interface MicroClientOpts<TConnOpts = any> extends ConfigableEndpointOptions<RequestPacket> {
    client?: Token<MicroClient>;
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
