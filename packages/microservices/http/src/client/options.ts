import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';
import * as http from 'node:http';
import { ClientSessionOptions, SecureClientSessionOptions, ClientSessionRequestOptions } from 'node:http2';

export interface HttpClientOptions extends ClientOptions {
    transport: Transport.HTTP;
    side: TransferSide.client;
    microservice?: boolean;
    url?: string;
    requestOpts?: http.RequestOptions;
    authority?: string;
    connectOpts?: ClientSessionOptions | SecureClientSessionOptions;
    requestOptions?: ClientSessionRequestOptions;
}

export const HTTP_CLIENT_OPTIONS = token<HttpClientOptions>('HTTP_CLIENT_OPTIONS');
