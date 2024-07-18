import { tokenId } from '@tsdi/ioc';
import { Interceptor, Filter } from '@tsdi/core';
import { ResponseEvent } from '@tsdi/common';
import { ClientOpts } from '@tsdi/common/client';
import * as amqp from 'amqplib';
import { AmqpSessionOpts } from '../options';
import { AmqpRequest } from './request';



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
 * AMQP client interceptors.
 */
export const AMQP_CLIENT_INTERCEPTORS = tokenId<Interceptor<AmqpRequest<any>, ResponseEvent<any>>[]>('AMQP_CLIENT_INTERCEPTORS');
/**
 * AMQP client filters.
 */
export const AMQP_CLIENT_FILTERS = tokenId<Filter[]>('AMQP_CLIENT_FILTERS');
