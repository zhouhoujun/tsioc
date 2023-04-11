import * as http2 from 'http2';
import { Abstract, tokenId } from '@tsdi/ioc';
import { Filter, EndpointOptions, Interceptor } from '@tsdi/core';
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
@Abstract()
export abstract class HttpClientOpts implements EndpointOptions<HttpRequest> {
    /**
     * http2 authority.
     */
    abstract authority?: string;
    /**
     * http2 session options.
     */
    abstract options?: HttpSessionOpts;
    /**
     * request options.
     */
    abstract requestOptions?: http2.ClientSessionRequestOptions;
}

/**
 * http client interceptors for `Http`.
 */
export const HTTP_INTERCEPTORS = tokenId<Interceptor<HttpRequest, HttpEvent>[]>('HTTP_INTERCEPTORS');
/**
 * http client filters for `Http`.
 */
export const HTTP_CLIENT_EXECPTION_FILTERS = tokenId<Filter<HttpRequest, HttpEvent>[]>('HTTP_CLIENT_FILTERS');
/**
 * http serssion options.
 */
export const HTTP_SESSIONOPTIONS = tokenId<HttpSessionOpts>('HTTP_SESSIONOPTIONS');

