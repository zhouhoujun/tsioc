import { ProvdierOf } from '@tsdi/ioc';
import { ConfigableEndpointOptions } from '@tsdi/core';
import { TransportOpts, TransportRequest } from '@tsdi/common';
import { TransportResponseEventFactory } from './backend';
import { ClientTransportSessionFactory } from './session';
import { RequestEncoder, ResponseDecoder } from './codings';


/**
 * client transport packet strategy.
 */
export interface ClientTransportPacketStrategy {
    /**
    * encoder
    */
    encoder: ProvdierOf<RequestEncoder>;
    /**
     * decoder
     */
    decoder: ProvdierOf<ResponseDecoder>;
}

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
    transportOpts?: TransportOpts;
    timeout?: number;
    
    /**
     * client transport packet strategy.
     */
    strategy?: ClientTransportPacketStrategy;

    /**
     * response factory.
     */
    responseFactory?: ProvdierOf<TransportResponseEventFactory>;
    /**
     * session factory
     */
    sessionFactory?: ProvdierOf<ClientTransportSessionFactory>;
}
