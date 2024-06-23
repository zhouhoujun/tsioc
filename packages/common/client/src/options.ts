import { AbstractRequest, MessageFactory, ResponseFactory } from '@tsdi/common';
import { ClientIncomingFactory, MessageReader, MessageWriter, StatusAdapter, TransportOpts } from '@tsdi/common/transport';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { ProvdierOf, Token } from '@tsdi/ioc';
import { ClientBackend } from './backend';
import { ClientTransportSessionFactory } from './session';


/**
 * Client options.
 */
export interface ClientOpts<TConnOpts = any> extends ConfigableHandlerOptions<AbstractRequest> {
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
    transportOpts?: TransportOpts;
    /**
     * message factory.
     */
    messageFactory?: ProvdierOf<MessageFactory>;
    /**
     * message reader.
     */
    readonly messageReader?: ProvdierOf<MessageReader>;
    /**
     * message writer.
     */
    readonly messageWriter?: ProvdierOf<MessageWriter>;
    /**
     * incoming factory.
     */
    incomingFactory?: ProvdierOf<ClientIncomingFactory>;
    /**
     * response packet factory.
     */
    responseFactory?: ProvdierOf<ResponseFactory>;
    /**
     * service transport session factory.
     */
    sessionFactory?: ProvdierOf<ClientTransportSessionFactory>;
    /**
     * transport backend.
     */
    backend?: Token<ClientBackend> | ClientBackend;
}
