import { Interceptor, Filter, GuardLike } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ServiceConfig } from '@tsdi/endpoints';
import * as amqp from 'amqplib';
import { AmqpSessionOpts } from '../options';

export type amqpURL = string | amqp.Options.Connect;

/**
 * amqp service config.
 */
export interface AmqpServConfig extends ServiceConfig<string | amqp.Options.Connect>, AmqpSessionOpts {

    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
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
export const AMQP_SERV_GUARDS = tokenId<GuardLike[]>('AMQP_SERV_GUARDS');
