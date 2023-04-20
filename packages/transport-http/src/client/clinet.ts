import { createContext, Inject, Injectable, InvocationContext, promisify } from '@tsdi/ioc';
import {
    RequestMethod, RequestOptions, ResponseAs, ReqHeaders, ReqHeadersLike, PUT, Client, GET, DELETE, HEAD, JSONP, PATCH, POST, Shutdown
} from '@tsdi/core';
import { ev } from '@tsdi/transport';
import { HttpRequest, HttpEvent, HttpParams, HttpResponse } from '@tsdi/common';
import { mergeMap, Observable, of } from 'rxjs';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import { HttpGuardsHandler } from './handler';
import { HttpClientOpts, CLIENT_HTTP2SESSION, HTTP_CLIENT_OPTS } from './option';




export interface HttpRequestOpts extends RequestOptions {
    body?: any;
    method?: RequestMethod | undefined;
    headers?: ReqHeadersLike;
    params?: HttpParams | string
    | ReadonlyArray<[string, string | number | boolean]>
    | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
    majorVersion?: number;
    reportProgress?: boolean | undefined;
}

export type HttpNodeOpts = http.RequestOptions & https.RequestOptions;

export type HttpReqOptions = HttpRequestOpts & HttpNodeOpts;

const NONE = {} as http2.ClientHttp2Session;

/**
 * http client for nodejs
 */
@Injectable()
export class Http extends Client<HttpRequest, HttpEvent> {

    constructor(
        readonly handler: HttpGuardsHandler,
        @Inject(HTTP_CLIENT_OPTS) private option: HttpClientOpts) {
        super()
        if (!option?.authority) {
            this.connection = NONE;
        }
    }

    private connection?: http2.ClientHttp2Session | null;
    private $conn?: Observable<http2.ClientHttp2Session> | null;
    protected connect(): Observable<any> | Promise<any> {
        if (this.connection && this.isValid(this.connection)) {
            return of(this.$conn);
        }

        if (this.$conn) return this.$conn;

        const opts = this.option;
        this.$conn = of(this.createConnection(opts))
            .pipe(
                mergeMap(connection => this.onConnect(connection, opts)),
                mergeMap(async connection => {
                    this.connection = connection;
                    this.$conn = null;
                    return connection;
                })
            );
        return this.$conn;
    }

    protected isValid(connection: http2.ClientHttp2Session): boolean {
        if (connection === NONE) return true;
        return !connection.closed && !connection.destroyed;
    }

    protected createConnection(opts: HttpClientOpts): http2.ClientHttp2Session {
        return http2.connect(opts.authority!, opts.options);
    }

    protected onConnect(connection: http2.ClientHttp2Session, opts: HttpClientOpts): Observable<http2.ClientHttp2Session> {
        return new Observable((observer) => {
            let cleaned = false;
            const onError = (err: Error) => observer.error(err);
            const onConnect = () => {
                observer.next(connection);
                observer.complete();
            };
            const onClose = () => {
                observer.complete();
            }
            connection.on(ev.CONNECT, onConnect)
                .on(ev.ERROR, onError)
                .on(ev.END, onClose)
                .on(ev.CLOSE, onClose);

            return () => {
                if (cleaned) return;
                cleaned = true;
                connection.off(ev.CONNECT, onConnect)
                    .off(ev.ERROR, onError)
                    .off(ev.CLOSE, onClose)
            };
        })
    }

    protected override buildRequest(first: string | HttpRequest<any>, options: HttpReqOptions & ResponseAs): HttpRequest<any> {
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
            let headers: ReqHeaders | undefined = undefined;
            if (options.headers instanceof ReqHeaders) {
                headers = options.headers
            } else {
                headers = new ReqHeaders(options.headers)
            }

            // Sort out parameters.
            let params: HttpParams | undefined = undefined;
            if (options.params) {
                if (options.params instanceof HttpParams) {
                    params = options.params
                } else {
                    params = new HttpParams({ params: options.params })
                }
            }

            const context = options.context ?? createContext(this.handler.injector, options);
            context.setValue(Client, this);
            if (this.connection && this.connection !== NONE) {
                context.setValue(CLIENT_HTTP2SESSION, this.connection);
            }

            // Construct the request.
            return new HttpRequest(options.method ?? GET, url!, (options.body !== undefined ? options.body : null), {
                ...options,
                headers,
                params,
                context,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        body?: any | null,
    } = {}): Observable<any> {
        return this.send<any>(url, merge(options, DELETE));
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    } = {}): Observable<any> {
        return this.send<any>(url, merge(options, GET))
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike, observe: 'response',
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',

    } = {}): Observable<any> {
        return this.send<any>(url, merge(options, HEAD))
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
            method: JSONP,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike, observe: 'events',
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
        headers?: ReqHeadersLike, observe: 'events',
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
        headers?: ReqHeadersLike, observe: 'events',
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
        headers?: ReqHeadersLike, observe: 'events',
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
        headers?: ReqHeadersLike, observe: 'events',
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
        headers?: ReqHeadersLike, observe: 'response',
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
        headers?: ReqHeadersLike, observe: 'response',
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
        headers?: ReqHeadersLike, observe: 'response',
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
        headers?: ReqHeadersLike, observe: 'response',
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
        headers?: ReqHeadersLike, observe: 'response',
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike, observe: 'events',
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
        headers?: ReqHeadersLike, observe: 'events',
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
        headers?: ReqHeadersLike, observe: 'events',
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
        headers?: ReqHeadersLike, observe: 'events',
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
        headers?: ReqHeadersLike, observe: 'events',
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
        headers?: ReqHeadersLike, observe: 'response',
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
        headers?: ReqHeadersLike, observe: 'response',
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
        headers?: ReqHeadersLike, observe: 'response',
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
        headers?: ReqHeadersLike, observe: 'response',
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
        headers?: ReqHeadersLike, observe: 'response',
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',

    } = {}): Observable<any> {
        return this.send<any>(url, merge(options, PATCH, body))
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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOpts): Observable<ArrayBuffer>;

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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    } & HttpNodeOpts): Observable<Blob>;

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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOpts): Observable<string>;

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
        headers?: ReqHeadersLike, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOpts): Observable<HttpEvent<ArrayBuffer>>;

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
        headers?: ReqHeadersLike, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    } & HttpNodeOpts): Observable<HttpEvent<Blob>>;

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
        headers?: ReqHeadersLike, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOpts): Observable<HttpEvent<string>>;

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
        headers?: ReqHeadersLike, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<HttpEvent<object>>;

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
        headers?: ReqHeadersLike, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<HttpEvent<T>>;

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
        headers?: ReqHeadersLike, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOpts): Observable<HttpResponse<ArrayBuffer>>;

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
        headers?: ReqHeadersLike, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    } & HttpNodeOpts): Observable<HttpResponse<Blob>>;

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
        headers?: ReqHeadersLike, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOpts): Observable<HttpResponse<string>>;

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
        headers?: ReqHeadersLike, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<HttpResponse<object>>;

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
        headers?: ReqHeadersLike, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<HttpResponse<T>>;

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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<object>;

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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `POST` request to execute on the server. The server responds with the location of
     * the replaced resource. See the individual overloads for
     * details on the return type.
     */
    post(url: string, body: any | null, options: {
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    } & HttpNodeOpts = {}): Observable<any> {
        return this.send<any>(url, merge(options, POST, body))
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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
    } & HttpNodeOpts): Observable<ArrayBuffer>;

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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
    } & HttpNodeOpts): Observable<Blob>;

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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
    } & HttpNodeOpts): Observable<string>;

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
        headers?: ReqHeadersLike, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOpts): Observable<HttpEvent<ArrayBuffer>>;

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
        headers?: ReqHeadersLike, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
    } & HttpNodeOpts): Observable<HttpEvent<Blob>>;

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
        headers?: ReqHeadersLike, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOpts): Observable<HttpEvent<string>>;

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
        headers?: ReqHeadersLike, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<HttpEvent<object>>;

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
        headers?: ReqHeadersLike, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<HttpEvent<T>>;

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
        headers?: ReqHeadersLike, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'arraybuffer',
    } & HttpNodeOpts): Observable<HttpResponse<ArrayBuffer>>;

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
        headers?: ReqHeadersLike, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'blob',
    } & HttpNodeOpts): Observable<HttpResponse<Blob>>;

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
        headers?: ReqHeadersLike, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType: 'text',
    } & HttpNodeOpts): Observable<HttpResponse<string>>;

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
        headers?: ReqHeadersLike, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<HttpResponse<object>>;

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
        headers?: ReqHeadersLike, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<HttpResponse<T>>;

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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<object>;

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
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
    } & HttpNodeOpts): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `PUT` request to execute on the server. The `PUT` method replaces an existing resource
     * with a new set of values.
     * See the individual overloads for details on the return type.
     */
    put(url: string, body: any | null, options: {
        headers?: ReqHeadersLike,
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
    } & HttpNodeOpts = {}): Observable<any> {
        return this.send<any>(url, merge(options, PUT, body))
    }

    @Shutdown()
    async close(): Promise<void> {
        if (this.connection) {
            if (this.connection === NONE) return;
            await promisify(this.connection.close, this.connection)();
        }
    }

}


function merge<T>(
    options: {
        headers?: ReqHeadersLike,
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
