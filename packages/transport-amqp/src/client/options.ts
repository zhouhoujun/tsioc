import { Interceptor, TransportEvent, TransportRequest, ConfigableHandlerOptions, Filter, Client } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import * as amqp from 'amqplib';
import { AmqpSessionOpts } from '../options';



/**
 * AMQP client options.
 */
export interface AmqpClientOpts extends ConfigableHandlerOptions<TransportRequest> {

    /**
     * keep alive
     */
    keepalive?: number;
    /**
     * transport session options.
     */
    transportOpts?: AmqpSessionOpts;
    /**
     * connect options.
     */
    connectOpts?: string | amqp.Options.Connect;
    /**
     * request timeout.
     */
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}

/**
 * multi AMQP client options.
 */
export interface AmqpClientsOpts extends AmqpClientOpts {
    /**
     * client token.
     */
    client: Token<Client>;
}

export const AMQP_CHANNEL = tokenId<amqp.Channel>('AMQP_CHANNEL');


/**
 * AMQP client opptions.
 */
export const AMQP_CLIENT_OPTS = tokenId<AmqpClientOpts>('AMQP_CLIENT_OPTS');
/**
 * AMQP client interceptors.
 */
export const AMQP_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('AMQP_CLIENT_INTERCEPTORS');
/**
 * AMQP client filters.
 */
export const AMQP_CLIENT_FILTERS = tokenId<Filter[]>('AMQP_CLIENT_FILTERS');
