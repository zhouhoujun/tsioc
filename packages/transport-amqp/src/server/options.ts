import { ExecptionFilter, Interceptor, TransportRequest, TransportEndpointOptions } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import * as amqp from 'amqplib';
import { AmqpContext } from './context';

export type amqpURL = string | amqp.Options.Connect;


export interface AmqpServerOpts extends TransportEndpointOptions<AmqpContext> {
    url?: amqpURL;
    queue?: string;
    queueOptions?: amqp.Options.AssertQueue;
}


export const AMQP_SERV_OPTS = tokenId<AmqpServerOpts>('AMQP_SERV_OPTS');

/**
 * Amqp server interceptors.
 */
export const AMQP_SERV_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransitionEvent>[]>('AMQP_SERV_INTERCEPTORS');

/**
 * Amqp server execption filters.
 */
export const AMQP_SERV_EXECPTION_FILTERS = tokenId<ExecptionFilter[]>('AMQP_SERV_EXECPTION_FILTERS');

