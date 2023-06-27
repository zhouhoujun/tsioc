import { Interceptor, TransportEvent, TransportRequest, ConfigableHandlerOptions, Filter, Client } from '@tsdi/core';
import { Token, tokenId } from '@tsdi/ioc';
import { ConnectionOptions, SubscriptionOptions } from 'nats';
import { NatsSessionOpts } from '../options';


/**
 * NATS client options.
 */
export interface NatsClientOpts extends ConfigableHandlerOptions<TransportRequest> {

    /**
     * keep alive
     */
    keepalive?: number;
    /**
     * transport session options.
     */
    transportOpts?: NatsSessionOpts;
    /**
     * connect options.
     */
    connectOpts?: ConnectionOptions;
    /**
     * subscription options.
     */
    subscriptionOpts?: SubscriptionOptions;
    /**
     * request timeout.
     */
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    debug?: boolean;
}

/**
 * multi NATS client options.
 */
export interface NatsClientsOpts extends NatsClientOpts {
    /**
     * client token.
     */
    client: Token<Client>;
}

/**
 * NATS client opptions.
 */
export const NATS_CLIENT_OPTS = tokenId<NatsClientOpts>('NATS_CLIENT_OPTS');
/**
 * NATS client interceptors.
 */
export const NATS_CLIENT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('NATS_CLIENT_INTERCEPTORS');
/**
 * NATS client filters.
 */
export const NATS_CLIENT_FILTERS = tokenId<Filter[]>('NATS_CLIENT_FILTERS');
