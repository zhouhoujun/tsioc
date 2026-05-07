import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';
import * as http from 'node:http';

export interface HttpClientOptions extends ClientOptions {
    transport: Transport.HTTP;
    side: TransferSide.client;
    microservice?: boolean;
    url?: string;
    requestOpts?: http.RequestOptions;
}

export const HTTP_CLIENT_OPTIONS = token<HttpClientOptions>('HTTP_CLIENT_OPTIONS');
