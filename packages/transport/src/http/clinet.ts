import { Abstract, ArgumentError, EMPTY, Inject, Injectable, InvocationContext, isFunction, isString, lang, Nullable, tokenId, Type } from '@tsdi/ioc';
import { Interceptor, RequestMethod, TransportClient, EndpointBackend, HttpRequest, HttpResponse, HttpEvent, OnDispose, CustomEndpoint, HttpParams, HttpHeaders, InterceptorType } from '@tsdi/core';
import { from, fromEvent, Observable, Observer, of } from 'rxjs';
import * as http from 'node:http';
import * as https from 'node:https';
import * as http2 from 'node:http2';
import { Socket } from 'node:net';
import { TLSSocket } from 'node:tls';
import { ev } from '../consts';


// export type HttpResponse = http
/**
 * http interceptors for {@link Http}.
 */
export const HTTP_INTERCEPTORS = tokenId<Interceptor<HttpRequest, HttpEvent>[]>('HTTP_INTERCEPTORS');

export type HttpSessionOptions = http2.ClientSessionOptions | http2.SecureClientSessionOptions;

const abstUrlExp = /^http(s)?:/;
const secureExp = /^https:/;

export const HTTP_SESSIONOPTIONS = tokenId<HttpSessionOptions>('HTTP_SESSIONOPTIONS');

@Abstract()
export abstract class HttpClientOptions {
    abstract get interceptors(): InterceptorType<HttpRequest, HttpEvent>[] | undefined;
    abstract get authority(): string | undefined;
    abstract get options(): HttpSessionOptions | undefined;
}

export interface HttpRequestOptions {
    body?: any;
    method?: RequestMethod | undefined;
    headers?: any;
    params?: any;
    majorVersion?: number;
    observe?: 'body' | 'events' | 'response' | undefined;
    reportProgress?: boolean | undefined;
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | undefined;
    withCredentials?: boolean | undefined;
}

/**
 * http client for nodejs
 */
@Injectable()
export class Http extends TransportClient<HttpRequest, HttpEvent, HttpRequestOptions> implements OnDispose {

    private _backend?: EndpointBackend<HttpRequest, HttpEvent>;
    private client?: http2.ClientHttp2Session;

    constructor(
        @Inject() readonly context: InvocationContext,
        @Nullable() private option: HttpClientOptions) {
        super()

        const interceptors = this.option.interceptors?.map(m => {
            if (isFunction(m)) {
                return { provide: HTTP_INTERCEPTORS, useClass: m, multi: true }
            } else {
                return { provide: HTTP_INTERCEPTORS, useValue: m, multi: true }
            }
        }) ?? EMPTY;
        this.context.injector.inject(interceptors)
    }

    protected getRegInterceptors(): Interceptor<HttpRequest, HttpEvent>[] {
        return this.context.injector.get(HTTP_INTERCEPTORS, EMPTY)
    }

    protected getBackend(): EndpointBackend<HttpRequest, HttpEvent> {
        if (!this._backend) {
            this._backend = new CustomEndpoint((req, ctx) => {
                return new Observable((observer: Observer<HttpEvent<any>>) => {
                    let headers: Record<string, any> = {};
                    req.headers.forEach((name, values) => {
                        headers[name] = values
                    });

                    const onError = (err: Error) => observer.error(err);
                    const onData = (chunk: string) => {
                        // observer.next(chunk)
                    };
                    let onResponse: any;
                    let request: http.ClientRequest | http2.ClientHttp2Stream;
                    if (this.option.authority && this.client) {
                        let url = req.url.trim();
                        if (abstUrlExp.test(url)) {
                            if (!url.startsWith(this.option.authority)) throw new ArgumentError('Absolute url not start with authority.');
                            url = url.substring(this.option.authority.length)
                        }
                        request = this.client.request({
                            ...headers,
                            'accept': 'application/json, text/plain, */*',
                            method: req.method,
                            ':path': url
                        });
                        request.setEncoding('utf8');
                        onResponse = (headers: http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader, flags: number) => {

                        };

                    } else {
                        let option = {
                            method: req.method,
                            headers: {
                                ...headers,
                                'accept': 'application/json, text/plain, */*',
                            }
                        };
                        request = secureExp.test(req.url) ? https.request(option) : http.request(option);
                        onResponse = (respone: http.IncomingMessage) => {

                        };

                    }

                    request.on(ev.RESPONSE, onResponse);
                    request.on(ev.DATA, onData);
                    request.on(ev.ERROR, onError);
                    request.on(ev.ABOUT, onError);
                    request.on(ev.TIMEOUT, onError);
                    request.on(ev.END, () => {
                        observer.complete()
                    });

                    if (req.body) {
                        request.write(req.body)
                    }

                    request.end();

                    return () => {
                        request.off(ev.RESPONSE, onResponse);
                        request.off(ev.DATA, onData);
                        request.off(ev.ERROR, onError);
                        request.off(ev.ABOUT, onError);
                        request.off(ev.TIMEOUT, onError);
                        if (!ctx.destroyed) {
                            request.emit(ev.CLOSE);
                        }
                    }

                })
            })
        }
        return this._backend!
    }

    protected buildRequest(context: InvocationContext<any>, url: string | HttpRequest<any>, options?: HttpRequestOptions): HttpRequest<any> {
        if (isString(url)) {
            return new HttpRequest(options?.method ?? 'GET', url, options)
        }
        return url
    }

    protected async connect(): Promise<void> {
        if (this.option.authority) {
            if (this.client && !this.client.closed) return
            this.client = http2.connect(this.option.authority, this.option.options);
            this.client.on(ev.ERROR, (err) => {
                this.logger.error(err)
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
        body?: any | null,
    }): Observable<HttpEvent<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | (string | number | boolean)[] },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
        body?: any | null,
    }): Observable<HttpResponse<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
        body?: any | null,
    }): Observable<Object>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpEvent<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpResponse<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<Object>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `GET` request to execute on the server. See the individual overloads for
     * details on the return type.
     */
    get(url: string, options: {
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpEvent<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
    }): Observable<HttpResponse<string>>;

    /**
     * Constructs a `HEAD` request that interprets the body as a JSON object and
     * returns the full `HttpResponse`.
     *
     * @param url     The endpoint URL.
     * @param options The HTTP options to send with the request.
     *
     * @return An `Observable` of the `HttpResponse` for the request,
     * with the response body of type `Object`.
     */
    head(url: string, options: {
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpResponse<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<Object>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `HEAD` request to execute on the server. The `HEAD` method returns
     * meta information about the resource without transferring the
     * resource itself. See the individual overloads for
     * details on the return type.
     */
    head(url: string, options: {
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
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
    jsonp(url: string, callbackParam: string): Observable<Object>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpEvent<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpResponse<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<Object>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<T>;

    /**
     * Constructs an `Observable` that, when subscribed, causes the configured
     * `OPTIONS` request to execute on the server. This method allows the client
     * to determine the supported HTTP methods and other capabilities of an endpoint,
     * without implying a resource action. See the individual overloads for
     * details on the return type.
     */
    options(url: string, options: {
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpEvent<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpResponse<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<Object>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `PATCH` request to execute on the server. See the individual overloads for
     * details on the return type.
     */
    patch(url: string, body: any | null, options: {
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
    }): Observable<ArrayBuffer>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
    }): Observable<Blob>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
    }): Observable<string>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
    }): Observable<HttpEvent<ArrayBuffer>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
    }): Observable<HttpEvent<Blob>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
    }): Observable<HttpEvent<string>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpEvent<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpEvent<T>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
    }): Observable<HttpResponse<ArrayBuffer>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
    }): Observable<HttpResponse<Blob>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
    }): Observable<HttpResponse<string>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpResponse<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpResponse<T>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<Object>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `POST` request to execute on the server. The server responds with the location of
     * the replaced resource. See the individual overloads for
     * details on the return type.
     */
    post(url: string, body: any | null, options: {
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
    } = {}): Observable<any> {
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
    }): Observable<ArrayBuffer>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
    }): Observable<Blob>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
    }): Observable<string>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
    }): Observable<HttpEvent<ArrayBuffer>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
    }): Observable<HttpEvent<Blob>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
    }): Observable<HttpEvent<string>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpEvent<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpEvent<T>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
    }): Observable<HttpResponse<ArrayBuffer>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
    }): Observable<HttpResponse<Blob>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
    }): Observable<HttpResponse<string>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpResponse<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpResponse<T>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<Object>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<T>;

    /**
     * Constructs an observable that, when subscribed, causes the configured
     * `PUT` request to execute on the server. The `PUT` method replaces an existing resource
     * with a new set of values.
     * See the individual overloads for details on the return type.
     */
    put(url: string, body: any | null, options: {
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
    } = {}): Observable<any> {
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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
    }): Observable<ArrayBuffer>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
    }): Observable<Blob>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
    }): Observable<string>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        observe: 'events',
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
    }): Observable<HttpEvent<ArrayBuffer>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
    }): Observable<HttpEvent<Blob>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'events',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
    }): Observable<HttpEvent<string>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        reportProgress?: boolean, observe: 'events',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpEvent<any>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        reportProgress?: boolean, observe: 'events',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpEvent<R>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'arraybuffer',
        withCredentials?: boolean,
    }): Observable<HttpResponse<ArrayBuffer>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'blob',
        withCredentials?: boolean,
    }): Observable<HttpResponse<Blob>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] }, observe: 'response',
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean, responseType: 'text',
        withCredentials?: boolean,
    }): Observable<HttpResponse<string>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        reportProgress?: boolean, observe: 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpResponse<Object>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        reportProgress?: boolean, observe: 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
        withCredentials?: boolean,
    }): Observable<HttpResponse<R>>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
        reportProgress?: boolean,
        withCredentials?: boolean,
    }): Observable<Object>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        responseType?: 'json',
        reportProgress?: boolean,
        withCredentials?: boolean,
    }): Observable<R>;

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
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        observe?: 'body' | 'events' | 'response',
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
    }): Observable<any>;
    send(req: HttpRequest | string, options?: any): Observable<any> {
        return super.send(req as any, options)
    }

    async close(): Promise<void> {
        if (this.client) {
            const defer = lang.defer();
            this.client.close(() => defer.resolve());
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


function merge<T>(
    options: {
        headers?: HttpHeaders | { [header: string]: string | string[] },
        context?: InvocationContext,
        observe?: 'body' | 'events' | 'response',
        params?: HttpParams |
        { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> },
        reportProgress?: boolean,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
    },
    method: string,
    body?: T | null): any {
    return {
        ...options,
        method,
        body,
    }
}

