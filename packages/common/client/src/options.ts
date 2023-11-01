import { ProvdierOf, ProviderType } from '@tsdi/ioc';
import { ConfigableEndpointOptions } from '@tsdi/core';
import { Decoder, Encoder, TransportOpts, TransportRequest, TransportSessionFactory } from '@tsdi/common';


/**
 * client transport packet strategy.
 */
export interface ClientTransportPacketStrategy {
    /**
    * encoder
    */
    encoder: ProvdierOf<Encoder>;
    /**
     * decoder
     */
    decoder: ProvdierOf<Decoder>;
    /**
     * strategy providers.
     */
    providers?: ProviderType[];
}

export interface ClientOpts<TConnOpts = any> extends ConfigableEndpointOptions<TransportRequest> {
    [x: string]: any;
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
    strategy?: 'json' | 'asset' | ClientTransportPacketStrategy;

    /**
     * session factory
     */
    sessionFactory?: ProvdierOf<TransportSessionFactory>;
}
