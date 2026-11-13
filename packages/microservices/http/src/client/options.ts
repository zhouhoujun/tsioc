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
    /**
     * Throw a `ServiceError` when the response status is outside the accepted
     * range. Defaults to `true`; set to `false` to receive non-2xx bodies as
     * regular values (the previous behavior).
     */
    throwOnError?: boolean;
    /**
     * Custom status predicate; when provided it replaces the 2xx check.
     */
    validateStatus?: (status: number) => boolean;
}

export const HTTP_CLIENT_OPTIONS = token<HttpClientOptions>('HTTP_CLIENT_OPTIONS');
