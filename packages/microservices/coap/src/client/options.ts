import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';

export interface CoapClientOptions extends ClientOptions {
    transport: Transport.CoAP;
    side: TransferSide.client;
    microservice?: boolean;
    url?: string;
    port?: number;
    host?: string;
}

export const COAP_CLIENT_OPTIONS = token<CoapClientOptions>('COAP_CLIENT_OPTIONS');
