import { Interceptor, TransportRequest, TransportEndpointOptions, Filter, CanActivate, TransportSessionOpts } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ContentOptions } from '@tsdi/transport';
import * as amqp from 'amqplib';
import { AmqpContext } from './context';

export type amqpURL = string | amqp.Options.Connect;


export interface AmqpMicroServiceOpts extends TransportEndpointOptions<AmqpContext> {
    /**
     * connect options.
     */
    connectOpts?: string | amqp.Options.Connect;
    detailError?: boolean;
    timeout?: number;
    content?: ContentOptions;
    transportOpts?: TransportSessionOpts;
    queue?: string;
    queueOptions?: amqp.Options.AssertQueue;
}


export const AMQP_SERV_OPTS = tokenId<AmqpMicroServiceOpts>('AMQP_SERV_OPTS');

/**
 * Amqp server interceptors.
 */
export const AMQP_SERV_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransitionEvent>[]>('AMQP_SERV_INTERCEPTORS');

/**
 * Amqp server filters.
 */
export const AMQP_SERV_FILTERS = tokenId<Filter[]>('AMQP_SERV_FILTERS');

/**
 * Amqp Guards.
 */
export const AMQP_SERV_GUARDS = tokenId<CanActivate[]>('AMQP_SERV_GUARDS');
