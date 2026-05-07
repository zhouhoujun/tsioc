import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';

export interface NatsClientOptions extends ClientOptions {
    transport: Transport.NATS;
    side: TransferSide.client;
    microservice?: boolean;
    url?: string;
    servers?: string[];
}

export const NATS_CLIENT_OPTIONS = token<NatsClientOptions>('NATS_CLIENT_OPTIONS');
