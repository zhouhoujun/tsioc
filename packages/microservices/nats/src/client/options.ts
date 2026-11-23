import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';

export interface NatsClientOptions extends ClientOptions {
    transport: Transport.NATS;
    side: TransferSide.client;
    microservice?: boolean;
    url?: string;
    servers?: string[];
    /**
     * `jetstream` publishes `observe: 'events'` messages with `js.publish`.
     * Request/response stays on core NATS. The server must have created a
     * matching stream.
     */
    delivery?: 'core' | 'jetstream';
}

export const NATS_CLIENT_OPTIONS = token<NatsClientOptions>('NATS_CLIENT_OPTIONS');
