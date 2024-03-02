import { InvocationContext, isString, isUndefined } from '@tsdi/ioc';
import { HeadersLike, TransportHeaders } from './headers';
import { ParameterCodec, TransportParams } from './params';
import { Pattern } from './pattern';


/**
 * request options
 */
export interface RequestOptions<T = any> {
    /**
     * headers of request.
     */
    headers?: HeadersLike;
    /**
     * request method.
     */
    method?: string;
    /**
     * request params.
     */
    params?: TransportParams | string
    | ReadonlyArray<[string, string | number | boolean]>
    | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

    /**
     * parameter codec.
     */
    encoder?: ParameterCodec;
    /**
     * payload request.
     */
    payload?: T;
    /**
     * payload alias name.
     */
    body?: T;
    /**
     * request context.
     */
    context?: InvocationContext;
    /**
     * for restful
     */
    reportProgress?: boolean;
    /**
     * for restful
     */
    withCredentials?: boolean;
    /**
     * request timeout
     */
    timeout?: number;
}


/**
 * response option for request.
 */
export interface ResponseAs {
    /**
     * response observe type
     */
    observe?: 'body' | 'events' | 'response' | 'emit' | 'observe';
    /**
     * response data type.
     */
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
}

/**
 * Request init options.
 */
export interface RequestInitOpts<T = any> extends RequestOptions<T>, ResponseAs {
    /**
     * request context.
     */
    context: InvocationContext;
}


/**
 * Transport Request.
 */
export class TransportRequest<T = any> {
    readonly pattern: Pattern;
    readonly context: InvocationContext;
    readonly headers: TransportHeaders;
    readonly params: TransportParams;

    readonly method: string;

    readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    readonly observe: 'body' | 'events' | 'response' | 'emit' | 'observe';

    public payload: T | null;
    readonly reportProgress: boolean;
    readonly withCredentials: boolean;
    readonly url: string | undefined;
    readonly urlWithParams: string | undefined;

    get body(): T | null {
        return this.payload;
    }

    /**
     * client side timeout.
     */
    readonly timeout?: number;

    constructor(pattern: Pattern, options: RequestInitOpts<T>) {
        this.pattern = pattern;
        this.context = options.context;
        this.payload = options.payload ?? options.body ?? null;
        this.headers = new TransportHeaders(options.headers);
        this.params = new TransportParams(options);
        this.responseType = options.responseType ?? 'json';
        this.observe = options.observe ?? 'body';
        this.method = options.method ?? '';
        this.reportProgress = !!options.reportProgress;
        this.withCredentials = !!options.withCredentials;
        this.timeout = options.timeout;

        if (isString(pattern)) {
            const url = this.url = pattern;
            // If no parameters have been passed in, construct a new HttpUrlEncodedParams instance.
            if (!this.params.size) {
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
    }

    clone(): TransportRequest<T>;
    clone(update: {
        headers?: TransportHeaders;
        context?: InvocationContext<any>;
        method?: string;
        params?: TransportParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        pattern?: Pattern;
        body?: T | null;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
        timeout?: number | null;
    }): TransportRequest<T>
    clone<V>(update: {
        headers?: TransportHeaders;
        context?: InvocationContext<any>;
        method?: string;
        params?: TransportParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        pattern?: Pattern;
        body?: V | null;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
        timeout?: number | null;
    }): TransportRequest<V>;
    clone(update: {
        headers?: TransportHeaders;
        context?: InvocationContext<any>;
        method?: string;
        params?: TransportParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        pattern?: Pattern;
        body?: any;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
        timeout?: number | null;
    } = {}): TransportRequest {
        const pattern = update.pattern || this.pattern;
        const responseType = update.responseType || this.responseType;
        const observe = this.observe;
        const method = update.method ?? this.method;
        // The payload is somewhat special - a `null` value in update.payload means
        // whatever current payload is present is being overridden with an empty
        // payload, whereas an `undefined` value in update.payload implies no
        // override.
        let payload = isUndefined(update.payload) ?  update.body : update.payload;
        if (isUndefined(payload)) {
            payload = this.payload;
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

        const timeout = update.timeout ?? this.timeout;
        // Finally, construct the new HttpRequest using the pieces from above.
        return new TransportRequest(pattern, {
            payload,
            method,
            params,
            headers,
            responseType,
            observe,
            reportProgress,
            withCredentials,
            context,
            timeout
        })
    }
}

