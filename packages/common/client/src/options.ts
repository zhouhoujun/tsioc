import { ProvdierOf, Token } from '@tsdi/ioc';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { TransportRequest } from '@tsdi/common';
import { TransportBackend } from './backend';
import { StatusAdapter, TransportOpts } from '@tsdi/common/transport';
import { ClientTransportSessionFactory } from './session';
import { DefaultRequestEncodeHandler } from './codings/request.encodings';
import { DefaultResponseDecodeHandler } from './codings/response.decodings';

export interface ClientTransportOpts extends TransportOpts {
    defaultOutgoingHanlder?: ProvdierOf<DefaultRequestEncodeHandler>;
    defaultIncomingHanlder?: ProvdierOf<DefaultResponseDecodeHandler>;
}

/**
 * Client options.
 */
export interface ClientOpts<TConnOpts = any> extends ConfigableHandlerOptions<TransportRequest> {
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
     * status adapter
     */
    statusAdapter?: ProvdierOf<StatusAdapter>;
    /**
     * transport options.
     */
    transportOpts?: ClientTransportOpts;
    /**
     * service transport session factory.
     */
    sessionFactory?: ProvdierOf<ClientTransportSessionFactory>;
    /**
     * transport backend.
     */
    backend?: Token<TransportBackend> | TransportBackend;
}
