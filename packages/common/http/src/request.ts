import { isString, InvocationContext, EMPTY_OBJ, isUndefined, isNil } from '@tsdi/ioc';
import { DELETE, GET, HEAD, isArrayBuffer, isBlob, isFormData, isUrlSearchParams, JSONP, OPTIONS, HeadersLike, TransportRequest, TransportHeaders, Pattern } from '@tsdi/common';
import { HttpParams } from './params';


/**
 * Construction interface for `HttpRequest`s.
 *
 * All values are optional and will override default values if provided.
 */
export interface HttpRequestInit {
    headers?: HeadersLike;
    context?: InvocationContext;
    reportProgress?: boolean;
    params?: HttpParams;

    observe?: 'body' | 'events' | 'response';
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
    withCredentials?: boolean;
}

/**
 * Determine whether the given HTTP method may include a body.
 */
function mightHaveBody(method: string): boolean {
    switch (method) {
        case DELETE:
        case GET:
        case HEAD:
        case OPTIONS:
        case JSONP:
            return false
        default:
            return true
    }
}

/**
 * An outgoing HTTP request with an optional typed body.
 *
 * `HttpRequest` represents an outgoing request, including URL, method,
 * headers, body, and other request configuration options. Instances should be
 * assumed to be immutable. To modify a `HttpRequest`, the `clone`
 * method should be used.
 *
 * @publicApi
 */
export class HttpRequest<T = any> implements TransportRequest<T> {
    
    get pattern(): Pattern {
        return this.url;
    }

    get payload(): T | null {
        return this.body;
    }
    /**
     * The request body, or `null` if one isn't set.
     *
     * Bodies are not enforced to be immutable, as they can include a reference to any
     * user-defined data type. However, interceptors should take care to preserve
     * idempotence by treating them as such.
     */
    readonly body: T | null = null;

    /**
     * Outgoing headers for this request.
     */
    readonly headers!: TransportHeaders;

    /**
     * Whether this request should be made in a way that exposes progress events.
     *
     * Progress events are expensive (change detection runs on each event) and so
     * they should only be requested if the consumer intends to monitor them.
     */
    readonly reportProgress: boolean = false;

    /**
     * Whether this request should be sent with outgoing credentials (cookies).
     */
    readonly withCredentials: boolean = false;


    readonly observe: 'body' | 'events' | 'response' | 'observe' | 'emit';

    /**
     * The expected response type of the server.
     *
     * This is used to parse the response appropriately before returning it to
     * the requestee.
     */
    readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text' = 'json';

    /**
     * The outgoing HTTP request method.
     */
    readonly method: string;

    /**
     * Outgoing URL parameters.
     *
     * To pass a string representation of HTTP parameters in the URL-query-string format,
     * the `HttpParamsOptions`' `fromString` may be used. For example:
     *
     * ```
     * new HttpParams({fromString: 'angular=awesome'})
     * ```
     */
    // TODO(issue/24571): remove '!'.
    readonly params!: HttpParams;

    /**
     * The outgoing URL with all URL parameters set.
     */
    readonly urlWithParams: string;

    readonly context: InvocationContext<any>;

    constructor(method: 'DELETE' | 'GET' | 'HEAD' | 'JSONP' | 'OPTIONS', url: string, init?: {
        headers?: HeadersLike,
        reportProgress?: boolean,
        params?: HttpParams,
        observe?: 'body' | 'events' | 'response',
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
        context: InvocationContext
    });
    constructor(method: 'POST' | 'PUT' | 'PATCH', url: string, body: T | null, init?: {
        headers?: HeadersLike,
        reportProgress?: boolean,
        params?: HttpParams,
        observe?: 'body' | 'events' | 'response',
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
        context: InvocationContext
    });
    constructor(method: string, url: string, body: T | null, init?: {
        headers?: HeadersLike,
        reportProgress?: boolean,
        params?: HttpParams,
        observe?: 'body' | 'events' | 'response',
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
        context: InvocationContext
    });
    constructor(
        method: string, readonly url: string, third?: T | {
            headers?: HeadersLike,
            reportProgress?: boolean,
            params?: HttpParams,
            observe?: 'body' | 'events' | 'response',
            responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
            withCredentials?: boolean,
            context: InvocationContext
        } | null,
        fourth?: {
            headers?: HeadersLike,
            reportProgress?: boolean,
            params?: HttpParams,
            observe?: 'body' | 'events' | 'response',
            responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
            withCredentials?: boolean
        }) {
        this.method = method.toUpperCase();
        // Next, need to figure out which argument holds the HttpRequestInit
        // options, if any.
        let options: HttpRequestInit;

        // Check whether a body argument is expected. The only valid way to omit
        // the body argument is to use a known no-body method like GET.
        if (mightHaveBody(this.method) || !!fourth) {
            // Body is the third argument, options are the fourth.
            this.body = (third !== undefined) ? third as T : null;
            options = fourth || EMPTY_OBJ;
        } else {
            // No body required, options are the third argument. The body stays null.
            options = third as HttpRequestInit
        }


        this.observe = options.observe || 'body';
        this.context = options.context!;
        // If options have been passed, interpret them.
        if (options) {
            // Normalize reportProgress and withCredentials.
            this.reportProgress = !!options.reportProgress;
            this.withCredentials = !!options.withCredentials;

            // Override default response type of 'json' if one is provided.
            if (options.responseType) {
                this.responseType = options.responseType
            }

            // Override headers if they're provided.
            if (options.headers) {
                this.headers = new TransportHeaders(options.headers)
            }

            if (options.params) {
                this.params = options.params
            }
        }

        // If no headers have been passed in, construct a new HeadersLike instance.
        if (!this.headers) {
            this.headers = new TransportHeaders()
        }

        // If no parameters have been passed in, construct a new HttpUrlEncodedParams instance.
        if (!this.params) {
            this.params = new HttpParams();
            this.urlWithParams = url
        } else {
            // Encode the parameters to a string in preparation for inclusion in the URL.
            const params = this.params.toString();
            if (params.length === 0) {
                // No parameters, the visible URL is just the URL given at creation time.
                this.urlWithParams = url
            } else {
                // Does the URL already have query parameters? Look for '?'.
                const qIdx = url.indexOf('?');
                // There are 3 cases to handle:
                // 1) No existing parameters -> append '?' followed by params.
                // 2) '?' exists and is followed by existing query string ->
                //    append '&' followed by params.
                // 3) '?' exists at the end of the url -> append params directly.
                // This basically amounts to determining the character, if any, with
                // which to join the URL and parameters.
                const sep: string = qIdx === -1 ? '?' : (qIdx < url.length - 1 ? '&' : '');
                this.urlWithParams = url + sep + params
            }
        }
    }

    /**
     * Transform the free-form body into a serialized format suitable for
     * transmission to the server.
     */
    serializeBody(): ArrayBuffer | Blob | FormData | string | null {
        // If no body is present, no need to serialize it.
        if (isNil(this.body)) {
            return null
        }
        // Check whether the body is already in a serialized form. If so,
        // it can just be returned directly.
        if (isArrayBuffer(this.body) || isBlob(this.body) || isFormData(this.body) ||
            isUrlSearchParams(this.body) || isString(this.body)) {
            return this.body as any;
        }
        // Check whether the body is an instance of HttpUrlEncodedParams.
        if (this.body instanceof HttpParams) {
            return this.body.toString()
        }
        // Check whether the body is an object or array, and serialize with JSON if so.
        if (typeof this.body === 'object' || typeof this.body === 'boolean' ||
            Array.isArray(this.body)) {
            return JSON.stringify(this.body)
        }
        // Fall back on toString() for everything else.
        return (this.body as any).toString()
    }

    /**
     * Examine the body and attempt to infer an appropriate MIME type
     * for it.
     *
     * If no such type can be inferred, this method will return `null`.
     */
    detectContentTypeHeader(): string | null {
        // An empty body has no content type.
        if (this.body === null) {
            return null
        }
        // FormData bodies rely on the browser's content type assignment.
        if (isFormData(this.body)) {
            return null
        }
        // Blobs usually have their own content type. If it doesn't, then
        // no type can be inferred.
        if (isBlob(this.body)) {
            return this.body.type || null
        }
        // Array buffers have unknown contents and thus no type can be inferred.
        if (isArrayBuffer(this.body)) {
            return null
        }
        // Technically, strings could be a form of JSON data, but it's safe enough
        // to assume they're plain strings.
        if (isString(this.body)) {
            return 'text/plain'
        }
        // `HttpUrlEncodedParams` has its own content-type.
        if (this.body instanceof HttpParams) {
            return 'application/x-www-form-urlencoded;charset=UTF-8'
        }
        // Arrays, objects, boolean and numbers will be encoded as JSON.
        const type = typeof this.body;
        if (type === 'object' || type === 'number' || type === 'boolean') {
            return 'application/json'
        }
        // No type could be inferred.
        return null
    }

    clone(): HttpRequest<T>;
    clone(update: {
        headers?: TransportHeaders,
        context?: InvocationContext,
        reportProgress?: boolean,
        params?: HttpParams,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
        body?: T | null,
        payload?: T | null;
        method?: string,
        url?: string,
        setHeaders?: { [name: string]: string | string[] },
        setParams?: { [param: string]: string },
    }): HttpRequest<T>;
    clone<V>(update: {
        headers?: TransportHeaders,
        context?: InvocationContext,
        reportProgress?: boolean,
        params?: HttpParams,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
        body?: V | null,
        payload?: V | null;
        method?: string,
        url?: string,
        setHeaders?: { [name: string]: string | string[] },
        setParams?: { [param: string]: string },
    }): HttpRequest<V>;
    clone(update: {
        headers?: TransportHeaders,
        context?: InvocationContext,
        reportProgress?: boolean,
        params?: HttpParams,
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text',
        withCredentials?: boolean,
        body?: any | null,
        payload?: any;
        method?: string,
        url?: string,
        setHeaders?: { [name: string]: string | string[] },
        setParams?: { [param: string]: string };
    } = {}): HttpRequest {
        // For method, url, and responseType, take the current value unless
        // it is overridden in the update hash.
        const method = update.method || this.method;
        const url = update.url || this.url;
        const responseType = update.responseType || this.responseType;

        // The body is somewhat special - a `null` value in update.body means
        // whatever current body is present is being overridden with an empty
        // body, whereas an `undefined` value in update.body implies no
        // override.
        let body = isUndefined(update.body)?  update.payload: update.body;
        if(isUndefined(body)) {
            body = this.body;
        }

        // Carefully handle the boolean options to differentiate between
        // `false` and `undefined` in the update args.
        const withCredentials =
            (update.withCredentials !== undefined) ? update.withCredentials : this.withCredentials;
        const reportProgress =
            (update.reportProgress !== undefined) ? update.reportProgress : this.reportProgress;

        // Headers and params may be appended to if `setHeaders` or
        // `setParams` are used.
        let headers = update.headers || this.headers;
        let params = update.params || this.params;
        const context = update.context ?? this.context;
        // Check whether the caller has asked to add headers.
        if (update.setHeaders !== undefined) {
            // Set every requested header.
            headers =
                Object.keys(update.setHeaders)
                    .reduce((headers, name) => headers.set(name, update.setHeaders![name]), headers)
        }

        // Check whether the caller has asked to set params.
        if (update.setParams) {
            // Set every requested param.
            params = Object.keys(update.setParams)
                .reduce((params, param) => params.set(param, update.setParams![param]), params)
        }

        // Finally, construct the new HttpRequest using the pieces from above.
        return new HttpRequest(method, url, body, {
            params,
            headers,
            reportProgress,
            responseType,
            withCredentials,
            context
        })
    }
}
