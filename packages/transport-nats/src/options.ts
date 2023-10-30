import { TransportSessionOpts } from '@tsdi/transport';
import { PublishOptions } from 'nats';


export interface NatsSessionOpts extends TransportSessionOpts {
    reply?: string;
    publishOpts?: PublishOptions
}
