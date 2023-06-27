import { TransportSessionOpts } from '@tsdi/core';
import { PublishOptions } from 'nats';


export interface NatsSessionOpts extends TransportSessionOpts {
    reply?: string;
    publishOpts?: PublishOptions
}
