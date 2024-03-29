import { Interceptor, Filter } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { ClientOpts } from '@tsdi/common/client';
import { ConnectionOptions, SubscriptionOptions } from 'nats';
import { NatsSessionOpts } from '../options';


/**
 * NATS client options.
 */
export interface NatsClientOpts extends ClientOpts<ConnectionOptions> {
    /**
     * keep alive
     */
    keepalive?: number;
    /**
     * transport session options.
     */
    transportOpts?: NatsSessionOpts;
    /**
     * subscription options.
     */
    subscriptionOpts?: SubscriptionOptions;
    retryAttempts?: number;
    retryDelay?: number;
    debug?: boolean;
}


/**
 * NATS client interceptors.
 */
export const NATS_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('NATS_CLIENT_INTERCEPTORS');
/**
 * NATS client filters.
 */
export const NATS_CLIENT_FILTERS = tokenId<Filter[]>('NATS_CLIENT_FILTERS');
