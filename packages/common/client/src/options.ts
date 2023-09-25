import { Token } from '@tsdi/ioc';
import { ConfigableEndpointOptions } from '@tsdi/core';
import { RequestPacket, TransportOpts, TransportRequest } from '@tsdi/common';
import { Client } from './Client';


export interface ClientOpts<TConnOpts = any> extends ConfigableEndpointOptions<TransportRequest> {
    /**
     * url
     */
    url?: string;
    connectOpts?: TConnOpts;
    transportOpts?: TransportOpts;
    timeout?: number;
}

export interface ClientsOpts extends ClientOpts {
    client: Token<Client>;
}


export interface MicroClientOpts<TConnOpts = any> extends ConfigableEndpointOptions<RequestPacket> {
    /**
     * url
     */
    url?: string;
    connectOpts?: TConnOpts;
    transportOpts?: TransportOpts;
    timeout?: number;
}

export interface MicroClientsOpts extends MicroClientOpts {
    client: Token<Client>;
}