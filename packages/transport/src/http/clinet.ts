import { Abstract, ArgumentError, EMPTY_OBJ, Inject, Injectable, InvocationContext, isDefined, isString, isUndefined, lang, Nullable, Token, tokenId, type_str, type_undef } from '@tsdi/ioc';
import { Interceptor, RequestMethod, TransportClient, EndpointBackend, OnDispose, InterceptorType, InterceptorInst, ClientOptions, EndpointContext, Endpoint } from '@tsdi/core';
import { global, isBlob, isFormData, HttpRequest, HttpEvent, HttpHeaders, HttpParams, HttpParamsOptions, HttpResponse, HttpErrorResponse, HttpHeaderResponse, HttpStatusCode, statusMessage, isArrayBuffer, HttpJsonParseError } from '@tsdi/common';
import { HTTP_LISTENOPTIONS } from '@tsdi/platform-server';
import { filter, concatMap, map, Observable, Observer, of, defer, mergeMap } from 'rxjs';
import * as zlib from 'node:zlib';
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';
import { PassThrough, pipeline, Readable, Writable, PipelineSource } from 'node:stream';
import { promisify } from 'node:util';
import { Socket } from 'node:net';
import { TLSSocket, KeyObject } from 'node:tls';
import { ev, hdr } from '../consts';
import { HttpError } from './errors';
import { emptyStatus, redirectStatus } from './status';
import { isBuffer } from '../utils';
import * as NodeFormData from 'form-data';

const pmPipeline = promisify(pipeline);

if (typeof global.FormData === type_undef) {
    global.FormData = NodeFormData;
}


// export type HttpResponse = http
/**
 * http interceptors for {@link Http}.
 */
export const HTTP_INTERCEPTORS = tokenId<Interceptor<HttpRequest, HttpEvent>[]>('HTTP_INTERCEPTORS');

export type HttpSessionOptions = http2.ClientSessionOptions | http2.SecureClientSessionOptions;

export const HTTP_SESSIONOPTIONS = tokenId<HttpSessionOptions>('HTTP_SESSIONOPTIONS');

@Abstract()
export abstract class HttpClientOptions implements ClientOptions<HttpRequest, HttpEvent> {
    abstract interceptors?: InterceptorType<HttpRequest, HttpEvent>[];
    abstract authority?: string;
    abstract options?: HttpSessionOptions;
    abstract requestOptions?: http2.ClientSessionRequestOptions;
}

const defOpts = {
    interceptors: []
} as HttpClientOptions;

export type HttpHeadersType = HttpHeaders | { [header: string]: string | string[] } | http.OutgoingHttpHeaders;
export interface HttpRequestOptions {
    body?: any;
    method?: RequestMethod | undefined;
    headers?: HttpHeadersType;
    params?: any;
    majorVersion?: number;
    observe?: 'body' | 'events' | 'response' | undefined;
    reportProgress?: boolean | undefined;
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | undefined;
}

export type HttpNodeOptions = http.RequestOptions & https.RequestOptions;

export type RequestOptions = HttpRequestOptions & HttpNodeOptions;

export const CLIENT_HTTP2SESSION = tokenId<http2.ClientHttp2Session>('CLIENT_HTTP2SESSION');

/**
 * http client for nodejs
 */
@Injectable()
export class Http extends TransportClient<HttpRequest, HttpEvent, RequestOptions> implements OnDispose {

    private _backend?: EndpointBackend<HttpRequest, HttpEvent>;
    private _client?: http2.ClientHttp2Session;
    private option: HttpClientOptions;
    constructor(
        @Inject() readonly context: InvocationContext,
        @Nullable() option: HttpClientOptions) {
        super()

        this.option = { ...defOpts, ...option } as HttpClientOptions;
        this.context.injector.setValue(HttpClientOptions, this.option);
        this.option.interceptors?.push(NormlizePathInterceptor, NormlizeBodyInterceptor);
        this.initialize(this.option);
    }

    get client() {
        return this._client;
    }

    protected getInterceptorsToken(): Token<InterceptorInst<HttpRequest<any>, HttpEvent<any>>[]> {
        return HTTP_INTERCEPTORS;
    }

    protected getBackend(): EndpointBackend<HttpRequest, HttpEvent> {
        if (!this._backend) {
            this._backend = new HttpBackend(this.option);
        }
        return this._backend
    }

    protected override async connect(): Promise<void> {
        if (this.option.authority) {
            if (this._client && !this._client.closed) return;
            this._client = http2.connect(this.option.authority, this.option.options);
            const defer = lang.defer();
            this._client.once(ev.ERROR, (err) => {
                this.logger.error(err);
                defer.reject(err);
            });
            this._client.once(ev.CONNECT, () => defer.resolve());
            await defer.promise;
        }
    }

    protected override request(context: EndpointContext, first: string | HttpRequest<any>, options: RequestOptions = EMPTY_OBJ): Observable<HttpEvent<any>> {
        const req = this.buildRequest(first, options);
        if (this.client) {
            context.setValue(CLIENT_HTTP2SESSION, this.client);
        }

        // Start with an Observable.of() the initial request, and run the handler (which
        // includes all interceptors) inside a concatMap(). This way, the handler runs
        // inside an Observable chain, which causes interceptors to be re-run on every
        // subscription (this also makes retries re-run the handler, including interceptors).
        const events$: Observable<HttpEvent<any>> =
            of(req).pipe(concatMap((req: HttpRequest<any>) => this.chain().handle(req, context)));

        // If coming via the API signature which accepts a previously constructed HttpRequest,
        // the only option is to get the event stream. Otherwise, return the event stream if
        // that is what was requested.
        if (first instanceof HttpRequest || options.observe === 'events') {
            return events$
        }

        // The requested stream contains either the full response or the body. In either
        // case, the first step is to filter the event stream to extract a stream of
        // responses(s).
        const res$: Observable<HttpResponse<any>> = <Observable<HttpResponse<any>>>events$.pipe(
            filter((event: HttpEvent<any>) => event instanceof HttpResponse));

        // Decide which stream to return.
        switch (options.observe || 'body') {
            case 'body':
                // The requested stream is the body. Map the response stream to the response
                // body. This could be done more simply, but a misbehaving interceptor might
                // transform the response body into a different format and ignore the requested
                // responseType. Guard against this by validating that the response is of the
                // requested type.
                switch (req.responseType) {
                    case 'arraybuffer':
                        return res$.pipe(map((res: HttpResponse<any>) => {
                            // Validate that the body is an ArrayBuffer.
                            if (res.body !== null && !(res.body instanceof ArrayBuffer)) {
                                throw new Error('Response is not an ArrayBuffer.')
                            }
                            return res.body
                        }));
                    case 'blob':
                        return res$.pipe(map((res: HttpResponse<any>) => {
                            // Validate that the body is a Blob.
                            if (res.body !== null && !(res.body instanceof Blob)) {
                                throw new Error('Response is not a Blob.')
                            }
                            return res.body
                        }));
                    case 'text':
                        return res$.pipe(map((res: HttpResponse<any>) => {
                            // Validate that the body is a string.
                            if (res.body !== null && typeof res.body !== type_str) {
                                throw new Error('Response is not a string.')
                            }
                            return res.body
                        }));
                    case 'json':
                    default:
                        // No validation needed for JSON responses, as they can be of any type.
                        return res$.pipe(map((res: HttpResponse<any>) => res.body))
                }
            case 'response':
                // The response stream was requested directly, so return it.
                return res$
            default:
                // Guard against new future observe types being added.
                throw new Error(`Unreachable: unhandled observe type ${options.observe}}`)
        }
    }

    protected override buildRequest(first: string | HttpRequest<any>, options: RequestOptions): HttpRequest<any> {
        // First, check whether the primary argument is an instance of `HttpRequest`.
        if (first instanceof HttpRequest) {
            // It is. The other arguments must be undefined (per the signatures) and can be
            // ignored.
            return first;
        } else {
            // It's a string, so it represents a URL. Construct a request based on it,
            // and incorporate the remaining arguments (assuming `GET` unless a method is
            // provided.

            const url = first as string;
            // Figure out the headers.
            let headers: HttpHeaders | undefined = undefined;
            if (options.headers instanceof HttpHeaders) {
                headers = options.headers
            } else {
                headers = new HttpHeaders(options.headers as Record<string, any>)
            }

            // Sort out parameters.
            let params: HttpParams | undefined = undefined;
            if (options.params) {
                if (options.params instanceof HttpParams) {
                    params = options.params
                } else {
                    params = new HttpParams({ fromObject: options.params } as HttpParamsOptions)
                }
            }

            // Construct the request.
            return new HttpRequest(options.method ?? 'GET', url!, (options.body !== undefined ? options.body : null), {
                ...options,
                headers,
                params,
                reportProgress: options.reportProgress,
                // By default, JSON is assumed to be returned for all calls.
                responseType: options.responseType || 'json'
            })
        }
    }

    /**
     * Constructs a `DELETE` request that interprets the body as an `ArrayBuffer`
     *  and returns the response as an `ArrayBuffer`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return  An `Observable` of the response body as an `ArrayBuffer`.
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        body?: any | null,
    }): Observable<ArrayBuffer>;


    /**
     * Constructs a `DELETE` request that interprets the body as a `Blob` and returns
     * the response as a `Blob`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response body as a `Blob`.
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
        body?: any | null,
    }): Observable<Blob>;

    /**
     * Constructs a `DELETE` request that interprets the body as a text string and returns
     * a string.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type string.
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        observe?: 'body',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
        body?: any | null,
    }): Observable<string>;

    /**
     * Constructs a `DELETE` request that interprets the body as an `ArrayBuffer`
     *  and returns the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with response body as an `ArrayBuffer`.
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
        body?: any | null
    }): Observable<HttpEvent<ArrayBuffer>>;

    /**
     * Constructs a `DELETE` request that interprets the body as a `Blob`
     *  and returns the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all the `HttpEvent`s for the request, with the response body as a
     * `Blob`.
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
        body?: any | null,
    }): Observable<HttpEvent<Blob>>;

    /**
     * Constructs a `DELETE` request that interprets the body as a text string
     * and returns the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request, with the response
     * body of type string.
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
        body?: any | null,
    }): Observable<HttpEvent<string>>;

    /**
     * Constructs a `DELETE` request that interprets the body as a JSON object
     * and returns the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request, with response body of
     * type `Object`.
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        body?: any | null,
    }): Observable<HttpEvent<object>>;

    /**
     * Constructs a `DELETE`request that interprets the body as a JSON object
     * and returns the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all the `HttpEvent`s for the request, with a response
     * body in the requested type.
     */
    delete<T>(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | (string | number | boolean)[] },
        reportProgress?: boolean,
        responseType?: 'json',
        body?: any | null,
    }): Observable<HttpEvent<T>>;

    /**
     * Constructs a `DELETE` request that interprets the body as an `ArrayBuffer` and returns
     *  the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the full `HttpResponse`, with the response body as an `ArrayBuffer`.
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
        body?: any | null,
    }): Observable<HttpResponse<ArrayBuffer>>;

    /**
     * Constructs a `DELETE` request that interprets the body as a `Blob` and returns the full
     * `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body of type `Blob`.
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
        body?: any | null,
    }): Observable<HttpResponse<Blob>>;

    /**
     * Constructs a `DELETE` request that interprets the body as a text stream and
     *  returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the full `HttpResponse`, with the response body of type string.
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
        body?: any | null,
    }): Observable<HttpResponse<string>>;

    /**
     * Constructs a `DELETE` request the interprets the body as a JSON object and returns
     * the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body of type `Object`.
     *
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        body?: any | null,
    }): Observable<HttpResponse<object>>;

    /**
     * Constructs a `DELETE` request that interprets the body as a JSON object
     * and returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body of the requested type.
     */
    delete<T>(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        body?: any | null,
    }): Observable<HttpResponse<T>>;

    /**
     * Constructs a `DELETE` request that interprets the body as a JSON object and
     * returns the response body as a JSON object.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type `Object`.
     */
    delete(url: string, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        body?: any | null,
    }): Observable<object>;

    /**
     * Constructs a DELETE request that interprets the body as a JSON object and returns
     * the response in a given type.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with response body in the requested type.
     */
    delete<T>(url: string, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        body?: any | null,
    }): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `DELETE` request to execute on the server. See the individual overloads for
     * details on the return type.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     */
    delete(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        body?: any | null,
    } = {}): Observable<any> {
        return this.send<any>(url, merge(options, 'DELETE'));
    }


    /**
     * Constructs a `GET` request that interprets the body as an `ArrayBuffer` and returns the
     * response in an `ArrayBuffer`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    }): Observable<ArrayBuffer>;

    /**
     * Constructs a `GET` request that interprets the body as a `Blob`
     * and returns the response as a `Blob`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body as a `Blob`.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    }): Observable<Blob>;

    /**
     * Constructs a `GET` request that interprets the body as a text string
     * and returns the response as a string value.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type string.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    }): Observable<string>;

    /**
     * Constructs a `GET` request that interprets the body as an `ArrayBuffer` and returns
     *  the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request, with the response
     * body as an `ArrayBuffer`.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    }): Observable<HttpEvent<ArrayBuffer>>;

    /**
     * Constructs a `GET` request that interprets the body as a `Blob` and
     * returns the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body as a `Blob`.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    }): Observable<HttpEvent<Blob>>;

    /**
     * Constructs a `GET` request that interprets the body as a text string and returns
     * the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type string.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    }): Observable<HttpEvent<string>>;

    /**
     * Constructs a `GET` request that interprets the body as a JSON object
     * and returns the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type `Object`.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    }): Observable<HttpEvent<object>>;

    /**
     * Constructs a `GET` request that interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with a response body in the requested type.
     */
    get<T>(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    }): Observable<HttpEvent<T>>;

    /**
     * Constructs a `GET` request that interprets the body as an `ArrayBuffer` and
     * returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body as an `ArrayBuffer`.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    }): Observable<HttpResponse<ArrayBuffer>>;

    /**
     * Constructs a `GET` request that interprets the body as a `Blob` and
     * returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body as a `Blob`.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    }): Observable<HttpResponse<Blob>>;

    /**
     * Constructs a `GET` request that interprets the body as a text stream and
     * returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body of type string.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    }): Observable<HttpResponse<string>>;

    /**
     * Constructs a `GET` request that interprets the body as a JSON object and
     * returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the full `HttpResponse`,
     * with the response body of type `Object`.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    }): Observable<HttpResponse<object>>;

    /**
     * Constructs a `GET` request that interprets the body as a JSON object and
     * returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the full `HttpResponse` for the request,
     * with a response body in the requested type.
     */
    get<T>(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    }): Observable<HttpResponse<T>>;

    /**
     * Constructs a `GET` request that interprets the body as a JSON object and
     * returns the response body as a JSON object.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     *
     * @return An `Observable` of the response body as a JSON object.
     */
    get(url: string, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    }): Observable<object>;

    /**
     * Constructs a `GET` request that interprets the body as a JSON object and returns
     * the response body in a given type.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with a response body in the requested type.
     */
    get<T>(url: string, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    }): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `GET` request to execute on the server. See the individual overloads for
     * details on the return type.
     */
    get(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    } = {}): Observable<any> {
        return this.send<any>(url, merge(options, 'GET'))
    }


    /**
     * Constructs a `HEAD` request that interprets the body as an `ArrayBuffer` and
     * returns the response as an `ArrayBuffer`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
     */
    head(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    }): Observable<ArrayBuffer>;

    /**
     * Constructs a `HEAD` request that interprets the body as a `Blob` and returns
     * the response as a `Blob`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return  An `Observable` of the response, with the response body as a `Blob`.
     */

    head(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    }): Observable<Blob>;

    /**
     * Constructs a `HEAD` request that interprets the body as a text string and returns the response
     * as a string value.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type string.
     */
    head(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    }): Observable<string>;

    /**
     * Constructs a `HEAD` request that interprets the body as an  `ArrayBuffer`
     *  and returns the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body as an `ArrayBuffer`.
     */
    head(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    }): Observable<HttpEvent<ArrayBuffer>>;

    /**
     * Constructs a `HEAD` request that interprets the body as a `Blob` and
     * returns the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body as a `Blob`.
     */
    head(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    }): Observable<HttpEvent<Blob>>;

    /**
     * Constructs a `HEAD` request that interprets the body as a text string
     * and returns the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request, with the response body of type
     * string.
     */
    head(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    }): Observable<HttpEvent<string>>;

    /**
     * Constructs a `HEAD` request that interprets the body as a JSON object
     * and returns the full HTTP event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request, with a response body of
     * type `Object`.
     */
    head(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    }): Observable<HttpEvent<object>>;

    /**
     * Constructs a `HEAD` request that interprets the body as a JSON object and
     * returns the full event stream.
     *
     * @return An `Observable` of all the `HttpEvent`s for the request,
     * with a response body in the requested type.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     */
    head<T>(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'events',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    }): Observable<HttpEvent<T>>;

    /**
     * Constructs a `HEAD` request that interprets the body as an `ArrayBuffer`
     *  and returns the full HTTP response.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body as an `ArrayBuffer`.
     */
    head(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    }): Observable<HttpResponse<ArrayBuffer>>;

    /**
     * Constructs a `HEAD` request that interprets the body as a `Blob` and returns
     * the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body as a blob.
     */
    head(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    }): Observable<HttpResponse<Blob>>;

    /**
     * Constructs a `HEAD` request that interprets the body as text stream
     * and returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body of type string.
     */
    head(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    }): Observable<HttpResponse<string>>;

    /**
     * Constructs a `HEAD` request that interprets the body as a JSON object and
     * returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body of type `object`.
     */
    head(url: string, options: {
        headers?: HttpHeadersType,
        observe: 'response',
        context?: InvocationContext,
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    }): Observable<HttpResponse<object>>;

    /**
     * Constructs a `HEAD` request that interprets the body as a JSON object
     * and returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with a response body of the requested type.
     */
    head<T>(url: string, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<HttpResponse<T>>;

    /**
     * Constructs a `HEAD` request that interprets the body as a JSON object and
     * returns the response body as a JSON object.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body as a JSON object.
     */
    head(url: string, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<object>;

    /**
     * Constructs a `HEAD` request that interprets the body as a JSON object and returns
     * the response in a given type.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with a response body of the given type.
     */
    head<T>(url: string, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `HEAD` request to execute on the server. The `HEAD` method returns
     * meta information about the resource without transferring the
     * resource itself. See the individual overloads for
     * details on the return type.
     */
    head(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',

    } = {}): Observable<any> {
        return this.send<any>(url, merge(options, 'HEAD'))
    }

    /**
     * Constructs a `JSONP` request for the given URL and name of the callback parameter.
     *
     * @param url The resource URL.
     * @param callbackParam The callback function name.
     *
     * @return An `Observable` of the response object, with response body as an object.
     */
    jsonp(url: string, callbackParam: string): Observable<object>;

    /**
     * Constructs a `JSONP` request for the given URL and name of the callback parameter.
     *
     * @param url The resource URL.
     * @param callbackParam The callback function name.
     *
     * You must install a suitable interceptor, such as one provided by `HttpClientJsonpModule`.
     * If no such interceptor is reached,
     * then the `JSONP` request can be rejected by the configured backend.
     *
     * @return An `Observable` of the response object, with response body in the requested type.
     */
    jsonp<T>(url: string, callbackParam: string): Observable<T>;

    /**
     * Constructs an `Observable` that, when subscribed, causes a request with the special method
     * `JSONP` to be dispatched via the interceptor pipeline.
     * The [JSONP pattern](https://en.wikipedia.org/wiki/JSONP) works around limitations of certain
     * API endpoints that don't support newer,
     * and preferable [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) protocol.
     * JSONP treats the endpoint API as a JavaScript file and tricks the browser to process the
     * requests even if the API endpoint is not located on the same domain (origin) as the client-side
     * application making the request.
     * The endpoint API must support JSONP callback for JSONP requests to work.
     * The resource API returns the JSON response wrapped in a callback function.
     * You can pass the callback function name as one of the query parameters.
     * Note that JSONP requests can only be used with `GET` requests.
     *
     * @param url The resource URL.
     * @param callbackParam The callback function name.
     *
     */
    jsonp<T>(url: string, callbackParam: string): Observable<T> {
        return this.send<any>(url, {
            method: 'JSONP',
            params: new HttpParams().append(callbackParam, 'JSONP_CALLBACK'),
            observe: 'body',
            responseType: 'json',
        })
    }

    /**
     * Constructs an `OPTIONS` request that interprets the body as an
     * `ArrayBuffer` and returns the response as an `ArrayBuffer`.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
     */
    options(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',

    }): Observable<ArrayBuffer>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as a `Blob` and returns
     * the response as a `Blob`.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of the response, with the response body as a `Blob`.
     */
    options(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',

    }): Observable<Blob>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as a text string and
     * returns a string value.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of the response, with the response body of type string.
     */
    options(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',

    }): Observable<string>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as an `ArrayBuffer`
     *  and returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return  An `Observable` of all `HttpEvent`s for the request,
     * with the response body as an `ArrayBuffer`.
     */
    options(url: string, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',

    }): Observable<HttpEvent<ArrayBuffer>>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as a `Blob` and
     * returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body as a `Blob`.
     */
    options(url: string, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',

    }): Observable<HttpEvent<Blob>>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as a text string
     * and returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of all the `HttpEvent`s for the request,
     * with the response body of type string.
     */
    options(url: string, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',

    }): Observable<HttpEvent<string>>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as a JSON object
     * and returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of all the `HttpEvent`s for the request with the response
     * body of type `Object`.
     */
    options(url: string, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<HttpEvent<object>>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as a JSON object and
     * returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of all the `HttpEvent`s for the request,
     * with a response body in the requested type.
     */
    options<T>(url: string, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<HttpEvent<T>>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as an `ArrayBuffer`
     *  and returns the full HTTP response.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body as an `ArrayBuffer`.
     */
    options(url: string, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',

    }): Observable<HttpResponse<ArrayBuffer>>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as a `Blob`
     *  and returns the full `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body as a `Blob`.
     */
    options(url: string, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',

    }): Observable<HttpResponse<Blob>>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as text stream
     * and returns the full `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body of type string.
     */
    options(url: string, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',

    }): Observable<HttpResponse<string>>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as a JSON object
     * and returns the full `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body of type `Object`.
     */
    options(url: string, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<HttpResponse<object>>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as a JSON object and
     * returns the full `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with a response body in the requested type.
     */
    options<T>(url: string, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<HttpResponse<T>>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as a JSON object and returns the
     * response body as a JSON object.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of the response, with the response body as a JSON object.
     */
    options(url: string, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<object>;

    /**
     * Constructs an `OPTIONS` request that interprets the body as a JSON object and returns the
     * response in a given type.
     *
     * @param url The endpoint URL.
     * @param options HTTP options.
     *
     * @return An `Observable` of the `HttpResponse`, with a response body of the given type.
     */
    options<T>(url: string, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<T>;

    /**
     * Constructs an `Observable` that, when subscribed, causes the configured
     * `OPTIONS` request to execute on the server. This method allows the client
     * to determine the supported HTTP methods and other capabilities of an endpoint,
     * without implying a resource action. See the individual overloads for
     * details on the return type.
     */
    options(url: string, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',

    } = {}): Observable<any> {
        return this.send<any>(url, merge(options, 'OPTIONS'))
    }

    /**
     * Constructs a `PATCH` request that interprets the body as an `ArrayBuffer` and returns
     * the response as an `ArrayBuffer`.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',

    }): Observable<ArrayBuffer>;

    /**
     * Constructs a `PATCH` request that interprets the body as a `Blob` and returns the response
     * as a `Blob`.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of the response, with the response body as a `Blob`.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',

    }): Observable<Blob>;

    /**
     * Constructs a `PATCH` request that interprets the body as a text string and
     * returns the response as a string value.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of the response, with a response body of type string.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',

    }): Observable<string>;

    /**
     * Constructs a `PATCH` request that interprets the body as an `ArrayBuffer` and
     *  returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of all the `HttpEvent`s for the request,
     * with the response body as an `ArrayBuffer`.
     */

    patch(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',

    }): Observable<HttpEvent<ArrayBuffer>>;

    /**
     * Constructs a `PATCH` request that interprets the body as a `Blob`
     *  and returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of all the `HttpEvent`s for the request, with the
     * response body as `Blob`.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',

    }): Observable<HttpEvent<Blob>>;

    /**
     * Constructs a `PATCH` request that interprets the body as a text string and
     * returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of all the `HttpEvent`s for the request, with a
     * response body of type string.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',

    }): Observable<HttpEvent<string>>;

    /**
     * Constructs a `PATCH` request that interprets the body as a JSON object
     * and returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of all the `HttpEvent`s for the request,
     * with a response body of type `Object`.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<HttpEvent<object>>;

    /**
     * Constructs a `PATCH` request that interprets the body as a JSON object
     * and returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of all the `HttpEvent`s for the request,
     * with a response body in the requested type.
     */
    patch<T>(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<HttpEvent<T>>;

    /**
     * Constructs a `PATCH` request that interprets the body as an `ArrayBuffer`
     *  and returns the full `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return  An `Observable` of the `HttpResponse` for the request,
     * with the response body as an `ArrayBuffer`.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',

    }): Observable<HttpResponse<ArrayBuffer>>;

    /**
     * Constructs a `PATCH` request that interprets the body as a `Blob` and returns the full
     * `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return  An `Observable` of the `HttpResponse` for the request,
     * with the response body as a `Blob`.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',

    }): Observable<HttpResponse<Blob>>;

    /**
     * Constructs a `PATCH` request that interprets the body as a text stream and returns the
     * full `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return  An `Observable` of the `HttpResponse` for the request,
     * with a response body of type string.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',

    }): Observable<HttpResponse<string>>;

    /**
     * Constructs a `PATCH` request that interprets the body as a JSON object
     * and returns the full `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with a response body in the requested type.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<HttpResponse<object>>;

    /**
     * Constructs a `PATCH` request that interprets the body as a JSON object
     * and returns the full `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with a response body in the given type.
     */
    patch<T>(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<HttpResponse<T>>;

    /**
     * Constructs a `PATCH` request that interprets the body as a JSON object and
     * returns the response body as a JSON object.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return An `Observable` of the response, with the response body as a JSON object.
     */
    patch(url: string, body: any | null, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<object>;

    /**
     * Constructs a `PATCH` request that interprets the body as a JSON object
     * and returns the response in a given type.
     *
     * @param url The endpoint URL.
     * @param body The resources to edit.
     * @param options HTTP options.
     *
     * @return  An `Observable` of the `HttpResponse` for the request,
     * with a response body in the given type.
     */
    patch<T>(url: string, body: any | null, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',

    }): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `PATCH` request to execute on the server. See the individual overloads for
     * details on the return type.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeaders | { [header: string]: string | string[] } | http.OutgoingHttpHeaders,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',

    } = {}): Observable<any> {
        return this.send<any>(url, merge(options, 'PATCH', body))
    }

    /**
     * Constructs a `POST` request that interprets the body as an `ArrayBuffer` and returns
     * an `ArrayBuffer`.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options.
     *
     * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOptions): Observable<ArrayBuffer>;

    /**
     * Constructs a `POST` request that interprets the body as a `Blob` and returns the
     * response as a `Blob`.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return An `Observable` of the response, with the response body as a `Blob`.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    } & HttpNodeOptions): Observable<Blob>;

    /**
     * Constructs a `POST` request that interprets the body as a text string and
     * returns the response as a string value.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return An `Observable` of the response, with a response body of type string.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOptions): Observable<string>;

    /**
     * Constructs a `POST` request that interprets the body as an `ArrayBuffer` and
     * returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body as an `ArrayBuffer`.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOptions): Observable<HttpEvent<ArrayBuffer>>;

    /**
     * Constructs a `POST` request that interprets the body as a `Blob`
     * and returns the response in an observable of the full event stream.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return An `Observable` of all `HttpEvent`s for the request, with the response body as `Blob`.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    } & HttpNodeOptions): Observable<HttpEvent<Blob>>;

    /**
     * Constructs a `POST` request that interprets the body as a text string and returns the full
     * event stream.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return  An `Observable` of all `HttpEvent`s for the request,
     * with a response body of type string.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOptions): Observable<HttpEvent<string>>;

    /**
     * Constructs a POST request that interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return  An `Observable` of all `HttpEvent`s for the request,
     * with a response body of type `Object`.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpEvent<object>>;

    /**
     * Constructs a POST request that interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with a response body in the requested type.
     */
    post<T>(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpEvent<T>>;

    /**
     * Constructs a POST request that interprets the body as an `ArrayBuffer`
     *  and returns the full `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return  An `Observable` of the `HttpResponse` for the request, with the response body as an
     * `ArrayBuffer`.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOptions): Observable<HttpResponse<ArrayBuffer>>;

    /**
     * Constructs a `POST` request that interprets the body as a `Blob` and returns the full
     * `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body as a `Blob`.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    } & HttpNodeOptions): Observable<HttpResponse<Blob>>;

    /**
     * Constructs a `POST` request that interprets the body as a text stream and returns
     * the full `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return  An `Observable` of the `HttpResponse` for the request,
     * with a response body of type string.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOptions): Observable<HttpResponse<string>>;

    /**
     * Constructs a `POST` request that interprets the body as a JSON object
     * and returns the full `HttpResponse`.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return An `Observable` of the `HttpResponse` for the request, with a response body of type
     * `Object`.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpResponse<object>>;

    /**
     * Constructs a `POST` request that interprets the body as a JSON object and returns the full
     * `HttpResponse`.
     *
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return An `Observable` of the `HttpResponse` for the request, with a response body in the
     * requested type.
     */
    post<T>(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpResponse<T>>;

    /**
     * Constructs a `POST` request that interprets the body as a
     * JSON object and returns the response body as a JSON object.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return An `Observable` of the response, with the response body as a JSON object.
     */
    post(url: string, body: any | null, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<object>;

    /**
     * Constructs a `POST` request that interprets the body as a JSON object
     * and returns an observable of the response.
     *
     * @param url The endpoint URL.
     * @param body The content to replace with.
     * @param options HTTP options
     *
     * @return  An `Observable` of the `HttpResponse` for the request, with a response body in the
     * requested type.
     */
    post<T>(url: string, body: any | null, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `POST` request to execute on the server. The server responds with the location of
     * the replaced resource. See the individual overloads for
     * details on the return type.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    } & HttpNodeOptions = {}): Observable<any> {
        return this.send<any>(url, merge(options, 'POST', body))
    }

    /**
     * Constructs a `PUT` request that interprets the body as an `ArrayBuffer` and returns the
     * response as an `ArrayBuffer`.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
    } & HttpNodeOptions): Observable<ArrayBuffer>;

    /**
     * Constructs a `PUT` request that interprets the body as a `Blob` and returns
     * the response as a `Blob`.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of the response, with the response body as a `Blob`.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
    } & HttpNodeOptions): Observable<Blob>;

    /**
     * Constructs a `PUT` request that interprets the body as a text string and
     * returns the response as a string value.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of the response, with a response body of type string.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
    } & HttpNodeOptions): Observable<string>;

    /**
     * Constructs a `PUT` request that interprets the body as an `ArrayBuffer` and
     * returns the full event stream.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body as an `ArrayBuffer`.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOptions): Observable<HttpEvent<ArrayBuffer>>;

    /**
     * Constructs a `PUT` request that interprets the body as a `Blob` and returns the full event
     * stream.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body as a `Blob`.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
    } & HttpNodeOptions): Observable<HttpEvent<Blob>>;

    /**
     * Constructs a `PUT` request that interprets the body as a text string and returns the full event
     * stream.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of all `HttpEvent`s for the request, with a response body
     * of type string.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOptions): Observable<HttpEvent<string>>;

    /**
     * Constructs a `PUT` request that interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of all `HttpEvent`s for the request, with a response body of
     * type `Object`.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpEvent<object>>;

    /**
     * Constructs a `PUT` request that interprets the body as a JSON object and returns the
     * full event stream.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with a response body in the requested type.
     */
    put<T>(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpEvent<T>>;

    /**
     * Constructs a `PUT` request that interprets the body as an
     * `ArrayBuffer` and returns an observable of the full HTTP response.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of the `HttpResponse` for the request, with the response body as an
     * `ArrayBuffer`.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOptions): Observable<HttpResponse<ArrayBuffer>>;

    /**
     * Constructs a `PUT` request that interprets the body as a `Blob` and returns the
     * full HTTP response.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body as a `Blob`.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    } & HttpNodeOptions): Observable<HttpResponse<Blob>>;

    /**
     * Constructs a `PUT` request that interprets the body as a text stream and returns the
     * full HTTP response.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of the `HttpResponse` for the request, with a response body of type
     * string.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOptions): Observable<HttpResponse<string>>;

    /**
     * Constructs a `PUT` request that interprets the body as a JSON object and returns the full HTTP
     * response.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of the `HttpResponse` for the request, with a response body
     * of type 'Object`.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpResponse<object>>;

    /**
     * Constructs a `PUT` request that interprets the body as an instance of the requested type and
     * returns the full HTTP response.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with a response body in the requested type.
     */
    put<T>(url: string, body: any | null, options: {
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpResponse<T>>;

    /**
     * Constructs a `PUT` request that interprets the body as a JSON object
     * and returns an observable of JSON object.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of the response as a JSON object.
     */
    put(url: string, body: any | null, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<object>;

    /**
     * Constructs a `PUT` request that interprets the body as an instance of the requested type
     * and returns an observable of the requested type.
     *
     * @param url The endpoint URL.
     * @param body The resources to add/update.
     * @param options HTTP options
     *
     * @return An `Observable` of the requested type.
     */
    put<T>(url: string, body: any | null, options?: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOptions): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `PUT` request to execute on the server. The `PUT` method replaces an existing resource
     * with a new set of values.
     * See the individual overloads for details on the return type.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    } & HttpNodeOptions = {}): Observable<any> {
        return this.send<any>(url, merge(options, 'PUT', body))
    }

    /**
     * Sends an `HttpRequest` and returns a stream of `HttpEvent`s.
     *
     * @return An `Observable` of the response, with the response body as a stream of `HttpEvent`s.
     */
    send<R>(req: HttpRequest<any>): Observable<HttpEvent<R>>;

    /**
     * Constructs a request that interprets the body as an `ArrayBuffer` and returns the response in
     * an `ArrayBuffer`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     *
     * @return An `Observable` of the response, with the response body as an `ArrayBuffer`.
     */
    send(url: string, options: {
        method?: string;
        body?: any,
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
    } & HttpNodeOptions): Observable<ArrayBuffer>;

    /**
     * Constructs a request that interprets the body as a blob and returns
     * the response as a blob.
     * 
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type `Blob`.
     */
    send(url: string, options: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    } & HttpNodeOptions): Observable<Blob>;

    /**
     * Constructs a request that interprets the body as a text string and
     * returns a string value.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body of type string.
     */
    send(url: string, options: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOptions): Observable<string>;

    /**
     * Constructs a request that interprets the body as an `ArrayBuffer` and returns the
     * the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the response, with the response body as an array of `HttpEvent`s for
     * the request.
     */
    send(url: string, options: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType,
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        observe: 'events',
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOptions): Observable<HttpEvent<ArrayBuffer>>;

    /**
     * Constructs a request that interprets the body as a `Blob` and returns
     * the full event stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body of type `Blob`.
     */
    send(url: string, options: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    } & HttpNodeOptions): Observable<HttpEvent<Blob>>;

    /**
     * Constructs a request which interprets the body as a text string and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body of type string.
     */
    send(url: string, options: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOptions): Observable<HttpEvent<string>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the  request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body of type `Object`.
     */
    send(url: string, options: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType,
        context?: InvocationContext,
        reportProgress?: boolean, observe: 'events',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpEvent<any>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full event
     * stream.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of all `HttpEvent`s for the request,
     * with the response body of type `R`.
     */
    send<R>(url: string, options: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType,
        context?: InvocationContext,
        reportProgress?: boolean, observe: 'events',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpEvent<R>>;

    /**
     * Constructs a request which interprets the body as an `ArrayBuffer`
     * and returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body as an `ArrayBuffer`.
     */
    send(url: string, options: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOptions): Observable<HttpResponse<ArrayBuffer>>;

    /**
     * Constructs a request which interprets the body as a `Blob` and returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body of type `Blob`.
     */
    send(method: string, url: string, options: {
        body?: any,
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    } & HttpNodeOptions): Observable<HttpResponse<Blob>>;

    /**
     * Constructs a request which interprets the body as a text stream and returns the full
     * `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the HTTP response, with the response body of type string.
     */
    send(url: string, options: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
    } & HttpNodeOptions): Observable<HttpResponse<string>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full
     * `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the full `HttpResponse`,
     * with the response body of type `Object`.
     */
    send(url: string, options: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType,
        context?: InvocationContext,
        reportProgress?: boolean, observe: 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpResponse<object>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns
     * the full `HttpResponse` with the response body in the requested type.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return  An `Observable` of the full `HttpResponse`, with the response body of type `R`.
     */
    send<R>(url: string, options: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType,
        context?: InvocationContext,
        reportProgress?: boolean, observe: 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
    } & HttpNodeOptions): Observable<HttpResponse<R>>;

    /**
     * Constructs a request which interprets the body as a JSON object and returns the full
     * `HttpResponse` as a JSON object.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body of type `Object`.
     */
    send(url: string, options?: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
        reportProgress?: boolean,
    } & HttpNodeOptions): Observable<object>;

    /**
     * Constructs a request which interprets the body as a JSON object
     * with the response body of the requested type.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse`, with the response body of type `R`.
     */
    send<R>(url: string, options?: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
        reportProgress?: boolean,
    } & HttpNodeOptions): Observable<R>;

    /**
     * Constructs a request where response type and requested observable are not known statically.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the requested response, with body of type `any`.
     */
    send(url: string, options?: {
        method?: string,
        body?: any,
        headers?: HttpHeadersType,
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        observe?: 'body' | 'events' | 'response',
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    } & HttpNodeOptions): Observable<any>;
    send(req: HttpRequest | string, options?: any): Observable<any> {
        return super.send(req as any, options)
    }

    async close(): Promise<void> {
        if (this._client) {
            const defer = lang.defer();
            this._client.close(() => defer.resolve());
            return defer.promise
        }
    }

    /**
     * on dispose.
     */
    onDispose(): Promise<void> {
        return this.close()
    }

}

export class RequestStauts {
    public follow: number;
    public counter: number;
    public highWaterMark: number;
    public insecureHTTPParser: boolean;
    public referrerPolicy: ReferrerPolicy;
    public redirect: 'manual' | 'error' | 'follow' | '';
    readonly agent: http.Agent | boolean;
    readonly compress: boolean;
    constructor(init: {
        compress?: boolean;
        follow?: number;
        counter?: number;
        highWaterMark?: number;
        insecureHTTPParser?: boolean;
        referrerPolicy?: ReferrerPolicy;
        redirect?: 'manual' | 'error' | 'follow' | '';
        agent?: http.Agent | boolean;
    } = EMPTY_OBJ) {
        this.compress = init.compress ?? false;
        this.follow = init.follow ?? 20;
        this.counter = init.counter ?? 0;
        this.highWaterMark = init.highWaterMark ?? 16384;
        this.insecureHTTPParser = init.insecureHTTPParser ?? false;
        this.redirect = init.redirect ?? '';
        this.referrerPolicy = init.referrerPolicy ?? '';
        this.agent = init.agent ?? false;

    }
}


function merge<T>(
    options: {
        headers?: HttpHeadersType,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',

    },
    method: string,
    body?: T | null): any {
    return {
        ...options,
        method,
        body
    }
}

@Injectable()
export class Http1Backend extends EndpointBackend<HttpRequest, HttpEvent> {
    handle(req: HttpRequest<any>, ctx: EndpointContext): Observable<HttpEvent<any>> {
        return new Observable((observer: Observer<HttpEvent<any>>) => {
            const headers: Record<string, any> = {};
            req.headers.forEach((name, values) => {
                headers[name] = values
            });

            if (!headers[hdr.CONTENT_TYPE]) {
                headers[hdr.CONTENT_TYPE] = req.detectContentTypeHeader();
            }

            const url = req.urlWithParams.trim();
            const ac = new AbortController();
            const option = {
                method: req.method,
                headers: {
                    'accept': 'application/json, text/plain, */*',
                    ...headers,
                },
                abort: ac.signal
            } as HttpNodeOptions;

            const request = secureExp.test(url) ? https.request(url, option) : http.request(url, option);

            let status: number, statusText: string | undefined;
            let error: any;
            let ok = false;

            const onResponse = async (res: http.IncomingMessage) => {
                status = res.statusCode ?? 0;
                statusText = res.statusMessage;
                const headers = new HttpHeaders(res.headers as Record<string, any>);

                let body: any;

                if (status !== HttpStatusCode.NoContent) {
                    body = res.statusMessage;
                }
                if (status === 0) {
                    status = body ? HttpStatusCode.Ok : 0
                }

                ok = status >= 200 && status < 300;

                const rqstatus = ctx.get(RequestStauts) ?? {};

                // HTTP fetch step 5
                if (status && redirectStatus[status]) {
                    // HTTP fetch step 5.2
                    const location = headers.get(hdr.LOCATION);

                    // HTTP fetch step 5.3
                    let locationURL = null;
                    try {
                        locationURL = location === null ? null : new URL(location, req.url);
                    } catch {
                        // error here can only be invalid URL in Location: header
                        // do not throw when options.redirect == manual
                        // let the user extract the errorneous redirect URL
                        if (rqstatus.redirect !== 'manual') {
                            error = new HttpError(HttpStatusCode.BadRequest, `uri requested responds with an invalid redirect URL: ${location}`);
                            ok = false;
                        }
                    }

                    // HTTP fetch step 5.5
                    switch (rqstatus.redirect) {
                        case 'error':
                            error = new HttpError(HttpStatusCode.BadRequest, `uri requested responds with a redirect, redirect mode is set to error: ${req.url}`);
                            ok = false;
                            break;
                        case 'manual':
                            // Nothing to do
                            break;
                        case 'follow': {
                            // HTTP-redirect fetch step 2
                            if (locationURL === null) {
                                break;
                            }

                            // HTTP-redirect fetch step 5
                            if (rqstatus.counter >= rqstatus.follow) {
                                error = new HttpError(HttpStatusCode.BadRequest, `maximum redirect reached at: ${req.url}`);
                                ok = false;
                                break;
                            }

                            rqstatus.counter += 1;

                            // HTTP-redirect fetch step 6 (counter increment)
                            // Create a new Request object.

                            let reqheaders = req.headers;
                            let method = req.method;
                            let body = req.body;

                            // when forwarding sensitive headers like "Authorization",
                            // "WWW-Authenticate", and "Cookie" to untrusted targets,
                            // headers will be ignored when following a redirect to a domain
                            // that is not a subdomain match or exact match of the initial domain.
                            // For example, a redirect from "foo.com" to either "foo.com" or "sub.foo.com"
                            // will forward the sensitive headers, but a redirect to "bar.com" will not.
                            if (!isDomainOrSubdomain(req.url, locationURL)) {
                                for (const name of ['authorization', 'www-authenticate', 'cookie', 'cookie2']) {
                                    reqheaders = reqheaders.delete(name);
                                }
                            }

                            // HTTP-redirect fetch step 9
                            if (status !== 303 && req.body && req.body instanceof Readable) {
                                error = new HttpError(HttpStatusCode.BadRequest, 'Cannot follow redirect with body being a readable stream');
                                ok = false;
                            }

                            // HTTP-redirect fetch step 11
                            if (status === 303 || ((status === 301 || status === 302) && request.method === 'POST')) {
                                method = 'GET';
                                body = undefined;
                                reqheaders = reqheaders.delete('content-length');
                            }

                            // HTTP-redirect fetch step 14
                            const responseReferrerPolicy = parseReferrerPolicyFromHeader(headers);
                            if (responseReferrerPolicy) {
                                reqheaders = reqheaders.set(hdr.REFERRER_POLICY, responseReferrerPolicy);
                            }

                            // HTTP-redirect fetch step 15
                            req = req.clone({
                                method,
                                body,
                                headers: reqheaders
                            });
                            (ctx.target as Http).send(req).subscribe(observer);
                            return;
                        }

                        default:
                            error = new TypeError(`Redirect option '${rqstatus.redirect}' is not a valid value of RequestRedirect`);
                            ok = false;
                            break;
                    }
                }

                if (emptyStatus[status]) {
                    observer.next(new HttpHeaderResponse({
                        url,
                        headers,
                        status,
                        statusText
                    }));
                    observer.complete();
                    return;
                }


                body = pipeline(res, new PassThrough(), (err) => {
                    if (err) {
                        error = err;
                        ok = false;
                    }
                });

                // HTTP-network fetch step 12.1.1.3
                const codings = headers.get(hdr.CONTENT_ENCODING);

                // HTTP-network fetch step 12.1.1.4: handle content codings
                // in following scenarios we ignore compression support
                // 1. compression support is disabled
                // 2. HEAD request
                // 3. no Content-Encoding header
                // 4. no content response (204)
                // 5. content not modified response (304)

                if (rqstatus.compress && request.method !== 'HEAD' && codings) {
                    // For Node v6+
                    // Be less strict when decoding compressed responses, since sometimes
                    // servers send slightly invalid responses that are still accepted
                    // by common browsers.
                    // Always using Z_SYNC_FLUSH is what cURL does.
                    const zlibOptions = {
                        flush: zlib.constants.Z_SYNC_FLUSH,
                        finishFlush: zlib.constants.Z_SYNC_FLUSH
                    };

                    try {
                        if (codings === 'gzip' || codings === 'x-gzip') { // For gzip
                            const unzip = zlib.createGunzip(zlibOptions);
                            await pmPipeline(body, unzip);
                            body = unzip;
                        } else if (codings === 'deflate' || codings === 'x-deflate') { // For deflate
                            // Handle the infamous raw deflate response from old servers
                            // a hack for old IIS and Apache servers
                            const raw = new PassThrough();
                            await pmPipeline(res, raw);
                            const defer = lang.defer();
                            raw.once(ev.DATA, chunk => {
                                if ((chunk[0] & 0x0F) === 0x08) {
                                    body = pipeline(body, zlib.createInflate(), err => {
                                        if (err) {
                                            defer.reject(err);
                                        }
                                    });
                                } else {
                                    body = pipeline(body, zlib.createInflateRaw(), err => {
                                        if (err) {
                                            defer.reject(err);
                                        }
                                    });
                                }
                            });

                            raw.once('end', defer.resolve);

                            await defer.promise;

                        } else if (codings === 'br') { // For br
                            const unBr = zlib.createBrotliDecompress();
                            await pmPipeline(body, unBr);
                            body = unBr;
                        }
                    } catch (err) {
                        ok = false;
                        error = err;
                    }
                }


                let buffer: Buffer | undefined
                try {
                    buffer = await toBuffer(body);
                } catch (err) {
                    ok = false;
                    error = err;
                }
                let originalBody: any;

                if (buffer) {
                    switch (req.responseType) {
                        case 'json':
                            // Save the original body, before attempting XSSI prefix stripping.
                            body = new TextDecoder().decode(buffer);
                            originalBody = body;
                            try {
                                body = body.replace(XSSI_PREFIX, '');
                                // Attempt the parse. If it fails, a parse error should be delivered to the user.
                                body = body !== '' ? JSON.parse(body) : null
                            } catch (err) {
                                // Since the JSON.parse failed, it's reasonable to assume this might not have been a
                                // JSON response. Restore the original body (including any XSSI prefix) to deliver
                                // a better error response.
                                body = originalBody;

                                // If this was an error request to begin with, leave it as a string, it probably
                                // just isn't JSON. Otherwise, deliver the parsing error to the user.
                                if (ok) {
                                    // Even though the response status was 2xx, this is still an error.
                                    ok = false;
                                    // The parse error contains the text of the body that failed to parse.
                                    error = { error: err, text: body } as HttpJsonParseError
                                }
                            }
                            break;

                        case 'arraybuffer':
                            body = buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                            break;
                        case 'blob':
                            body = new Blob([buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)], {
                                type: res.headers[hdr.CONTENT_TYPE]
                            });
                            break;
                        case 'text':
                        default:
                            body = new TextDecoder().decode(buffer);
                    }
                }
                if (ok) {
                    observer.next(new HttpResponse({
                        url,
                        body,
                        headers,
                        status,
                        statusText
                    }));
                    observer.complete();
                } else {
                    observer.error(new HttpErrorResponse({
                        url,
                        error,
                        headers,
                        status,
                        statusText
                    }));
                }
            };

            const onError = (error: Error) => {
                const res = new HttpErrorResponse({
                    error,
                    status: status || 0,
                    statusText: statusText || 'Unknown Error',
                    url
                });
                observer.error(res)
            };

            request.on(ev.RESPONSE, onResponse);
            request.on(ev.ERROR, onError);
            request.on(ev.ABOUT, onError);
            request.on(ev.TIMEOUT, onError);

            //todo send body.
            const data = req.serializeBody();
            if (data === null) {
                request.end();
            } else {
                sendbody(
                    data,
                    request,
                    err => onError(err));
            }


            return () => {
                if (isUndefined(status)) {
                    ac.abort();
                }
                request.off(ev.RESPONSE, onResponse);
                // request.off(ev.DATA, onData);
                request.off(ev.ERROR, onError);
                request.off(ev.ABOUT, onError);
                request.off(ev.TIMEOUT, onError);
                if (!ctx.destroyed) {
                    observer.error(new HttpErrorResponse({
                        status: 0,
                        statusText: 'The operation was aborted.'
                    }));
                    request.emit(ev.CLOSE);
                }
            }
        })
    }
}

const {
    HTTP2_HEADER_AUTHORITY,
    HTTP2_HEADER_PATH,
    HTTP2_HEADER_METHOD,
    HTTP2_HEADER_ACCEPT
} = http2.constants;

const HTTP2_HEADER_STATUS = ':status';


@Injectable()
export class Http2Backend extends EndpointBackend<HttpRequest, HttpEvent> {
    constructor(private option: HttpClientOptions) {
        super();
    }
    handle(req: HttpRequest<any>, ctx: EndpointContext): Observable<HttpEvent<any>> {
        return new Observable((observer: Observer<HttpEvent<any>>) => {
            let url = req.urlWithParams.trim();
            if (this.option.authority) {
                url = url.slice(this.option.authority.length);
            }
            const reqHeaders: Record<string, any> = {};
            req.headers.forEach((name, values) => {
                reqHeaders[name] = values
            });

            if (!reqHeaders[hdr.CONTENT_TYPE]) {
                reqHeaders[hdr.CONTENT_TYPE] = req.detectContentTypeHeader();
            }
            reqHeaders[HTTP2_HEADER_ACCEPT] = 'application/json, text/plain, */*';
            reqHeaders[HTTP2_HEADER_METHOD] = req.method;
            reqHeaders[HTTP2_HEADER_PATH] = url;

            const ac = new AbortController();
            const request = ctx.get(CLIENT_HTTP2SESSION).request(reqHeaders, { ...this.option.requestOptions, signal: ac.signal } as http2.ClientSessionRequestOptions);
            request.setEncoding('utf8');

            const rqstatus = ctx.get(RequestStauts) ?? {};
            let onData: (chunk: string) => void;
            let onEnd: () => void;
            let status: number, statusText: string;
            let completed = false;

            let error: any;
            let ok = false;

            const onResponse = (hdrs: http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader, flags: number) => {
                let body: any;
                const headers = new HttpHeaders(hdrs as Record<string, any>);
                status = hdrs[HTTP2_HEADER_STATUS] ?? 0;

                ok = status >= 200 && status < 300;
                statusText = statusMessage[status as HttpStatusCode] ?? 'OK';

                // HTTP fetch step 5
                if (status && redirectStatus[status]) {
                    // HTTP fetch step 5.2
                    const location = headers.get(hdr.LOCATION);

                    // HTTP fetch step 5.3
                    let locationURL = null;
                    try {
                        locationURL = location === null ? null : new URL(location, req.url);
                    } catch {
                        // error here can only be invalid URL in Location: header
                        // do not throw when options.redirect == manual
                        // let the user extract the errorneous redirect URL
                        if (rqstatus.redirect !== 'manual') {
                            error = new HttpError(HttpStatusCode.BadRequest, `uri requested responds with an invalid redirect URL: ${location}`);
                            ok = false;
                        }
                    }

                    // HTTP fetch step 5.5
                    switch (rqstatus.redirect) {
                        case 'error':
                            error = new HttpError(HttpStatusCode.BadRequest, `uri requested responds with a redirect, redirect mode is set to error: ${req.url}`);
                            ok = false;
                            break;
                        case 'manual':
                            // Nothing to do
                            break;
                        case 'follow': {
                            // HTTP-redirect fetch step 2
                            if (locationURL === null) {
                                break;
                            }

                            // HTTP-redirect fetch step 5
                            if (rqstatus.counter >= rqstatus.follow) {
                                error = new HttpError(HttpStatusCode.BadRequest, `maximum redirect reached at: ${req.url}`);
                                ok = false;
                                break;
                            }



                            rqstatus.counter += 1;

                            // HTTP-redirect fetch step 6 (counter increment)
                            // Create a new Request object.

                            let reqheaders = req.headers;
                            let method = req.method;
                            let body = req.body;

                            // when forwarding sensitive headers like "Authorization",
                            // "WWW-Authenticate", and "Cookie" to untrusted targets,
                            // headers will be ignored when following a redirect to a domain
                            // that is not a subdomain match or exact match of the initial domain.
                            // For example, a redirect from "foo.com" to either "foo.com" or "sub.foo.com"
                            // will forward the sensitive headers, but a redirect to "bar.com" will not.
                            if (!isDomainOrSubdomain(req.url, locationURL)) {
                                for (const name of ['authorization', 'www-authenticate', 'cookie', 'cookie2']) {
                                    reqheaders = reqheaders.delete(name);
                                }
                            }

                            // HTTP-redirect fetch step 9
                            if (status !== 303 && req.body && req.body instanceof Readable) {
                                error = new HttpError(HttpStatusCode.BadRequest, 'Cannot follow redirect with body being a readable stream');
                                ok = false;
                            }

                            // HTTP-redirect fetch step 11
                            if (status === 303 || ((status === 301 || status === 302) && method === 'POST')) {
                                method = 'GET';
                                body = undefined;
                                reqheaders = reqheaders.delete('content-length');
                            }

                            // HTTP-redirect fetch step 14
                            const responseReferrerPolicy = parseReferrerPolicyFromHeader(headers);
                            if (responseReferrerPolicy) {
                                reqheaders = reqheaders.set(hdr.REFERRER_POLICY, responseReferrerPolicy);
                            }

                            // HTTP-redirect fetch step 15

                            req = req.clone({
                                method,
                                body,
                                headers: reqheaders
                            });
                            (ctx.target as Http).send(req).subscribe(observer);
                            completed = true;
                            return;
                        }

                        default:
                            error = new TypeError(`Redirect option '${rqstatus.redirect}' is not a valid value of RequestRedirect`);
                            ok = false;
                            break;
                    }
                }

                // if (!ok) {
                //     completed = true;
                //     observer.error(new HttpErrorResponse({
                //         url,
                //         error,
                //         status,
                //         statusText
                //     }));
                //     return
                // }

                if (emptyStatus[status]) {
                    completed = true;
                    observer.next(new HttpHeaderResponse({
                        url,
                        headers,
                        status,
                        statusText
                    }));
                    observer.complete();
                    return;
                }

                // HTTP-network fetch step 12.1.1.3
                const codings = headers.get(hdr.CONTENT_ENCODING);
                let strdata = '';
                onData = (chunk: string) => {
                    strdata += chunk;
                };
                onEnd = () => {
                    completed = true;
                    body = strdata;
                    if (status === 0) {
                        status = isDefined(body) ? HttpStatusCode.Ok : 0
                    }
                    let originalBody: any;
                    let buffer: Buffer;
                    switch (req.responseType) {
                        case 'json':
                            // Save the original body, before attempting XSSI prefix stripping.
                            // body = new TextDecoder().decode(buffer);
                            originalBody = body;
                            try {
                                body = body.replace(XSSI_PREFIX, '');
                                // Attempt the parse. If it fails, a parse error should be delivered to the user.
                                body = body !== '' ? JSON.parse(body) : null
                            } catch (err) {
                                // Since the JSON.parse failed, it's reasonable to assume this might not have been a
                                // JSON response. Restore the original body (including any XSSI prefix) to deliver
                                // a better error response.
                                body = originalBody;

                                // If this was an error request to begin with, leave it as a string, it probably
                                // just isn't JSON. Otherwise, deliver the parsing error to the user.
                                if (ok) {
                                    // Even though the response status was 2xx, this is still an error.
                                    ok = false;
                                    // The parse error contains the text of the body that failed to parse.
                                    error = { error: err, text: body } as HttpJsonParseError
                                }
                            }
                            break;

                        case 'arraybuffer':
                            buffer = Buffer.from(body);
                            body = buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                            break;
                        case 'blob':
                            buffer = Buffer.from(body);
                            body = new Blob([buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)], {
                                type: headers.get(hdr.CONTENT_TYPE) as string
                            });
                            break;
                        case 'text':
                        default:
                            break;
                    }

                    if (ok) {
                        observer.next(new HttpResponse({
                            url,
                            body,
                            headers,
                            status,
                            statusText
                        }));
                        observer.complete();
                    } else {
                        observer.error(new HttpErrorResponse({
                            url,
                            error: error ?? body,
                            status,
                            statusText
                        }));
                    }
                };
                request.on(ev.DATA, onData);
                request.on(ev.END, onEnd);

            }

            const onError = (error: Error) => {
                const res = new HttpErrorResponse({
                    url,
                    error,
                    status: status || 0,
                    statusText: statusText || 'Unknown Error',
                });
                observer.error(res)
            };

            request.on(ev.RESPONSE, onResponse);
            request.on(ev.ERROR, onError);
            request.on(ev.ABOUT, onError);
            request.on(ev.TIMEOUT, onError);

            //todo send body.
            const data = req.serializeBody();
            if (data === null) {
                request.end();
            } else {
                sendbody(
                    data,
                    request,
                    err => onError(err));
            }

            return () => {
                if (isUndefined(status)) {
                    ac.abort();
                }
                request.off(ev.RESPONSE, onResponse);
                request.off(ev.DATA, onData);
                request.off(ev.END, onEnd);
                request.off(ev.ERROR, onError);
                request.off(ev.ABOUT, onError);
                request.off(ev.TIMEOUT, onError);
                if (!ctx.destroyed) {
                    observer.error(new HttpError(0, 'The operation was aborted.'));
                    request.emit(ev.CLOSE);
                }
            }
        })
    }
}


export async function sendbody(data: any, request: Writable, error: (err: any) => void): Promise<void> {
    let source: PipelineSource<any>;
    try {
        if (isArrayBuffer(data)) {
            source = Buffer.from(data);
        } else if (isBuffer(data)) {
            source = data;
        } else if (isBlob(data)) {
            const arrbuff = await data.arrayBuffer();
            source = Buffer.from(arrbuff);
        } else if (isFormData(data)) {
            let form: NodeFormData;
            if (data instanceof NodeFormData) {
                form = data;
            } else {
                form = new NodeFormData();
                data.forEach((v, k, parent) => {
                    form.append(k, v);
                });
            }
            source = form.getBuffer();
        } else {
            source = String(data);
        }
        await pmPipeline(source, request)
    } catch (err) {
        error(err);
    }
}

async function toBuffer(body: PassThrough, limit = 0, url?: string) {
    const data = [];
    let bytes = 0;

    for await (const chunk of body) {
        if (limit > 0 && bytes + chunk.length > limit) {
            const error = new TypeError(`content size at ${url} over limit: ${limit}`);
            body.destroy(error);
            throw error;
        }
        bytes += chunk.length;
        data.push(chunk);
    }

    if (data.every(c => typeof c === 'string')) {
        return Buffer.from(data.join(''));
    }
    return Buffer.concat(data, bytes);

}


const abstUrlExp = /^http(s)?:/;
const secureExp = /^https:/;
const XSSI_PREFIX = /^\)\]\}',?\n/;

export class HttpBackend extends EndpointBackend<HttpRequest, HttpEvent> {
    constructor(private option: HttpClientOptions) {
        super();
    }

    private _http1?: Http1Backend;
    get http1() {
        if (!this._http1) {
            this._http1 = new Http1Backend();
        }
        return this._http1;
    }

    private _http2?: Http1Backend;
    get http2() {
        if (!this._http2) {
            this._http2 = new Http2Backend(this.option);
        }
        return this._http2;
    }

    handle(req: HttpRequest<any>, context: EndpointContext): Observable<HttpEvent<any>> {
        if (this.option.authority && req.url.startsWith(this.option.authority)) {
            return this.http2.handle(req, context);
        }
        return this.http1.handle(req, context);
    }

}

@Injectable()
export class NormlizePathInterceptor implements Interceptor<HttpRequest, HttpEvent> {

    constructor(private option: HttpClientOptions) { }

    intercept(req: HttpRequest<any>, next: Endpoint<HttpRequest<any>, HttpEvent<any>>, context: EndpointContext): Observable<HttpEvent<any>> {
        let url = req.url.trim();
        if (!abstUrlExp.test(url)) {
            if (this.option.authority) {
                url = new URL(url, this.option.authority).toString();
            } else {
                const { host, port, path, withCredentials } = context.get(HTTP_LISTENOPTIONS);
                const protocol = (req.withCredentials || withCredentials) ? 'https' : 'http';
                const urlPrefix = `${protocol}://${host ?? 'localhost'}:${port ?? 3000}${path ?? ''}`;
                const baseUrl = new URL(urlPrefix);
                url = new URL(url, baseUrl).toString();
            }
            req = req.clone({ url })
        }
        return next.handle(req, context);
    }
}

@Injectable()
export class NormlizeBodyInterceptor implements Interceptor<HttpRequest, HttpEvent> {

    constructor() { }

    intercept(req: HttpRequest<any>, next: Endpoint<HttpRequest<any>, HttpEvent<any>>, context: EndpointContext): Observable<HttpEvent<any>> {
        let body = req.serializeBody();
        if (body == null) {
            return next.handle(req, context);
        }
        return defer(async () => {
            let headers = req.headers;
            const contentType = req.detectContentTypeHeader();
            if (!headers.has(hdr.CONTENT_TYPE) && contentType) {
                headers = headers.set(hdr.CONTENT_TYPE, contentType);
            }
            if (!headers.has(hdr.CONTENT_LENGTH)) {
                if (isBlob(body)) {
                    const arrbuff = await body.arrayBuffer();
                    body = Buffer.from(arrbuff);
                } else if (isFormData(body)) {
                    let form: NodeFormData;
                    if (body instanceof NodeFormData) {
                        form = body;
                    } else {
                        form = new NodeFormData();
                        body.forEach((v, k, parent) => {
                            form.append(k, v);
                        });
                    }
                    body = form.getBuffer();
                }
                headers = headers.set(hdr.CONTENT_LENGTH, String(Buffer.byteLength(body as Buffer)));
            }

            return req.clone({
                headers,
                body
            })

        }).pipe(
            mergeMap(req => next.handle(req, context))
        );
    }
}


const isDomainOrSubdomain = (destination: string | URL, original: string | URL) => {
    const orig = new URL(original).hostname;
    const dest = new URL(destination).hostname;

    return orig === dest || orig.endsWith(`.${dest}`);
}

export const referPolicys = new Set([
    '',
    'no-referrer',
    'no-referrer-when-downgrade',
    'same-origin',
    'origin',
    'strict-origin',
    'origin-when-cross-origin',
    'strict-origin-when-cross-origin',
    'unsafe-url'
]);

const splitReg = /[,\s]+/;

export function parseReferrerPolicyFromHeader(headers: HttpHeaders) {
    const policyTokens = (headers.get('referrer-policy') || '').split(splitReg);
    let policy = '';
    for (const token of policyTokens) {
        if (token && referPolicys.has(token)) {
            policy = token;
        }
    }
    return policy;
}

