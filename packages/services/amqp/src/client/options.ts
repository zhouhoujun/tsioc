import { Token, tokenId } from '@tsdi/ioc';
import { Interceptor, Filter } from '@tsdi/core';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { ClientOpts } from '@tsdi/common/client';
import * as amqp from 'amqplib';
import { AmqpSessionOpts } from '../options';



/**
 * AMQP client options.
 */
export interface AmqpClientOpts extends ClientOpts<string | amqp.Options.Connect> {

    /**
     * keep alive
     */
    keepalive?: number;
    /**
     * transport session options.
     */
    transportOpts?: AmqpSessionOpts;
    /**
     * request timeout.
     */
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}

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
