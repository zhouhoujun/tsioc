import { Interceptor, Filter } from '@tsdi/core';
import { tokenId } from '@tsdi/ioc';
import { ResponseEvent } from '@tsdi/common';
import { ClientOpts } from '@tsdi/common/client';
import { ConnectionOptions, PublishOptions, SubscriptionOptions } from 'nats';
import { NatsRequest } from './request';


/**
 * NATS client options.
 */
export interface NatsClientOpts extends ClientOpts<ConnectionOptions> {
    /**
     * keep alive
     */
    keepalive?: number;
    /**
     * publish options
     */
    publishOpts?: PublishOptions;
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
export const NATS_CLIENT_INTERCEPTORS = tokenId<Interceptor<NatsRequest<any>, ResponseEvent<any>>[]>('NATS_CLIENT_INTERCEPTORS');
/**
 * NATS client filters.
 */
export const NATS_CLIENT_FILTERS = tokenId<Filter[]>('NATS_CLIENT_FILTERS');
