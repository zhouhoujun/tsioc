import * as http2 from 'http2';
import { Abstract, tokenId } from '@tsdi/ioc';
import { ClientOpts, ExecptionFilter, InterceptorFilter, InterceptorLike } from '@tsdi/core';
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
export abstract class HttpClientOpts extends ClientOpts<HttpRequest, HttpEvent> {
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
export const HTTP_INTERCEPTORS = tokenId<InterceptorLike<HttpRequest, HttpEvent>[]>('HTTP_INTERCEPTORS');
/**
 * http client interceptors for `Http`.
 */
 export const HTTP_CLIENT_FILTERS = tokenId<InterceptorFilter<HttpRequest, HttpEvent>[]>('HTTP_CLIENT_FILTERS');
/**
 * http client execption filters for `Http`.
 */
export const HTTP_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('HTTP_EXECPTIONFILTERS');
/**
 * http serssion options.
 */
export const HTTP_SESSIONOPTIONS = tokenId<HttpSessionOpts>('HTTP_SESSIONOPTIONS');

