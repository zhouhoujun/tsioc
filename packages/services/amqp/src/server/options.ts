import { Interceptor, Filter, CanActivate } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ServerOpts } from '@tsdi/endpoints';
import * as amqp from 'amqplib';
import { AmqpSessionOpts } from '../options';

export type amqpURL = string | amqp.Options.Connect;


export interface AmqpMicroServiceOpts extends ServerOpts<string | amqp.Options.Connect> {

    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    transportOpts?: AmqpSessionOpts & { maxSize?: number};
}

/**
 * Amqp server interceptors.
 */
export const AMQP_SERV_INTERCEPTORS = tokenId<Interceptor[]>('AMQP_SERV_INTERCEPTORS');

/**
 * Amqp server filters.
 */
export const AMQP_SERV_FILTERS = tokenId<Filter[]>('AMQP_SERV_FILTERS');

/**
 * Amqp Guards.
 */
export const AMQP_SERV_GUARDS = tokenId<CanActivate[]>('AMQP_SERV_GUARDS');
