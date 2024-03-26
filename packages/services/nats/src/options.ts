import { TransportOpts } from '@tsdi/common/transport';
import { PublishOptions, SubscriptionOptions } from 'nats';


export interface NatsSessionOpts extends TransportOpts {
    reply?: string;
    publishOpts?: PublishOptions;
    /**
     * subscription options.
     */
    subscriptionOpts?: SubscriptionOptions;
}
