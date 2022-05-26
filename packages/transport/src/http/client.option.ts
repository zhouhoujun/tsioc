import * as http2 from 'node:http2';
import { Abstract, tokenId } from '@tsdi/ioc';
import { ClientOptions, InterceptorInst, InterceptorType } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common';


/**
 * http serssion options.
 */
export type HttpSessionOptions = http2.ClientSessionOptions | http2.SecureClientSessionOptions;

/**
 * client session
 */
export const CLIENT_HTTP2SESSION = tokenId<http2.ClientHttp2Session>('CLIENT_HTTP2SESSION');

/**
 * http client options.
 */
@Abstract()
export abstract class HttpClientOptions implements ClientOptions<HttpRequest, HttpEvent> {
    /**
     * client interceptors
     */
    abstract interceptors?: InterceptorType<HttpRequest, HttpEvent>[];
    /**
     * http2 authority.
     */
    abstract authority?: string;
    /**
     * http2 session options.
     */
    abstract options?: HttpSessionOptions;
    /**
     * request options.
     */
    abstract requestOptions?: http2.ClientSessionRequestOptions;
}

/**
 * http interceptors for {@link Http}.
 */
export const HTTP_INTERCEPTORS = tokenId<InterceptorInst<HttpRequest, HttpEvent>[]>('HTTP_INTERCEPTORS');
/**
 * http serssion options.
 */
export const HTTP_SESSIONOPTIONS = tokenId<HttpSessionOptions>('HTTP_SESSIONOPTIONS');

