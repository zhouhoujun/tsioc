import * as http2 from 'node:http2';
import { Abstract, tokenId } from '@tsdi/ioc';
import { ClientOptions, InterceptorInst, InterceptorType } from '@tsdi/core';
import { HttpEvent, HttpRequest } from '@tsdi/common';


export type HttpSessionOptions = http2.ClientSessionOptions | http2.SecureClientSessionOptions;

export const CLIENT_HTTP2SESSION = tokenId<http2.ClientHttp2Session>('CLIENT_HTTP2SESSION');


@Abstract()
export abstract class HttpClientOptions implements ClientOptions<HttpRequest, HttpEvent> {
    abstract interceptors?: InterceptorType<HttpRequest, HttpEvent>[];
    abstract authority?: string;
    abstract options?: HttpSessionOptions;
    abstract requestOptions?: http2.ClientSessionRequestOptions;
}

/**
 * http interceptors for {@link Http}.
 */
export const HTTP_INTERCEPTORS = tokenId<InterceptorInst<HttpRequest, HttpEvent>[]>('HTTP_INTERCEPTORS');

export const HTTP_SESSIONOPTIONS = tokenId<HttpSessionOptions>('HTTP_SESSIONOPTIONS');

