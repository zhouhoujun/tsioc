import { TransportOpts } from '@tsdi/common';
import { PublishOptions, SubscriptionOptions } from 'nats';


export interface NatsSessionOpts extends TransportOpts {
    reply?: string;
    publishOpts?: PublishOptions;
    /**
     * subscription options.
     */
    subscriptionOpts?: SubscriptionOptions;
}
