import * as http2 from 'http2';
import { tokenId } from '@tsdi/ioc';
import { ConfigableHandlerOptions, Filter, Interceptor } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common';


/**
 * http serssion options.
 */
export type HttpSessionOpts = http2.ClientSessionOptions | http2.SecureClientSessionOptions;

/**
 * client session
 */
export const CLIENT_HTTP2SESSION = tokenId<http2.ClientHttp2Session>('CLIENT_HTTP2SESSION');

/**
 * http client options.
 */

export interface HttpClientOpts extends ConfigableHandlerOptions<HttpRequest> {
    /**
     * http2 authority.
     */
    authority?: string;
    /**
     * http2 session options.
     */
    options?: HttpSessionOpts;
    /**
     * request options.
     */
    requestOptions?: http2.ClientSessionRequestOptions;
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

