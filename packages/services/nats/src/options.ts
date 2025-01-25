import { TransportOptions } from '@tsdi/common/transport';
import { PublishOptions, SubscriptionOptions } from 'nats';


export interface NatsSessionOpts extends TransportOptions {
    reply?: string;
    publishOpts?: PublishOptions;
    /**
     * subscription options.
     */
    subscriptionOpts?: SubscriptionOptions;
}
