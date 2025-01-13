import { AbstractRequest, PatternFormatter, ResponseFactory } from '@tsdi/common';
import { ClientIncomingFactory, StatusAdapter } from '@tsdi/common/transport';
import { ConfigableHandlerOptions } from '@tsdi/core';
import { ProvdierOf, Token, Type } from '@tsdi/ioc';
import { ClientBackend } from './backend';
import { ClientTransportFactory } from './transport/transport';
import { ClientHandler } from './handler';
import { ClientTransferFactory } from './transport/transfer';


/**
 * Client options.
 */
export interface ClientOpts<TConnOpts = any> extends ConfigableHandlerOptions<AbstractRequest<any>> {
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
     * client handler type.
     */
    handlerType?: Type<ClientHandler>;
    /**
     * status adapter
     */
    statusAdapter?: ProvdierOf<StatusAdapter>;
    /**
     * pattern formatter
     */
    patternFormatter?: ProvdierOf<PatternFormatter>;
    /**
     * incoming factory.
     */
    incomingFactory?: ProvdierOf<ClientIncomingFactory>;
    /**
     * imcoming message transfer factory.
     */
    transferFactory?: ProvdierOf<ClientTransferFactory>;
    /**
     * response packet factory.
     */
    responseFactory?: ProvdierOf<ResponseFactory>;
    /**
     * service transport factory.
     */
    transportFactory?: ProvdierOf<ClientTransportFactory>;
    /**
     * transport backend.
     */
    backend?: Token<ClientBackend> | ClientBackend;
}
