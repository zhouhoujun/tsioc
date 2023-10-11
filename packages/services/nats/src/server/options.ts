import { Interceptor, Filter, CanActivate } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ServerOpts } from '@tsdi/endpoints';
import { ContentOptions } from '@tsdi/endpoints/assets';
import { ConnectionOptions } from 'nats';
import { NatsSessionOpts } from '../options';



export interface NatsMicroServOpts extends ServerOpts<ConnectionOptions> {
    /**
     * transport session options.
     */
    transportOpts?: NatsSessionOpts;
    detailError?: boolean;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    content?: ContentOptions;
    debug?: boolean;
}


export const NATS_SERV_OPTS = tokenId<NatsMicroServOpts>('NATS_SERV_OPTS');

/**
 * Nats server interceptors.
 */
export const NATS_SERV_INTERCEPTORS = tokenId<Interceptor[]>('NATS_SERV_INTERCEPTORS');

/**
 * Nats server filters.
 */
export const NATS_SERV_FILTERS = tokenId<Filter[]>('NATS_SERV_FILTERS');

/**
 * Nats Guards.
 */
export const NATS_SERV_GUARDS = tokenId<CanActivate[]>('NATS_SERV_GUARDS');
