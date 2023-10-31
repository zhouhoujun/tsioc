import { Token, tokenId } from '@tsdi/ioc';
import { Filter, Interceptor } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common/http';
import { Client, ClientOpts } from '@tsdi/common/client';
import { ClientSessionOptions, SecureClientSessionOptions, ClientSessionRequestOptions } from 'http2';

/**
 * http serssion options.
 */
export type HttpSessionOpts = ClientSessionOptions | SecureClientSessionOptions;


/**
 * http client options.
 */

export interface HttpClientOpts extends ClientOpts<HttpSessionOpts> {
    /**
     * http2 authority.
     */
    authority?: string;
    /**
     * request options.
     */
    requestOptions?: ClientSessionRequestOptions;
}

export interface HttpClientsOpts extends HttpClientOpts {
    /**
     * client token.
     */
    client: Token<Client>;
}

/**
 * http client opptions.
 */
export const HTTP_CLIENT_OPTS = tokenId<HttpClientOpts>('HTTP_CLIENT_OPTS');


/**
 * http client interceptors for `Http`.
 */
export const HTTP_CLIENT_INTERCEPTORS = tokenId<Interceptor<HttpRequest, HttpEvent>[]>('HTTP_CLIENT_INTERCEPTORS');
/**
 * http client filters for `Http`.
 */
export const HTTP_CLIENT_FILTERS = tokenId<Filter<HttpRequest, HttpEvent>[]>('HTTP_CLIENT_FILTERS');
/**
 * http serssion options.
 */
export const HTTP_SESSIONOPTIONS = tokenId<HttpSessionOpts>('HTTP_SESSIONOPTIONS');

