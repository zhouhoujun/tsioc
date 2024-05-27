import { InvocationContext, isUndefined } from '@tsdi/ioc';
import { HeadersLike, TransportHeaders } from './headers';
import { ParameterCodec, TransportParams } from './params';
import { Packet, PacketOpts } from './packet';
import { Pattern } from './pattern';



/**
 * Request packet.
 */
export abstract class AbstractRequest<T = any> extends Packet<T> {

    readonly context: InvocationContext;
    readonly method: string;
    readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    readonly observe: 'body' | 'events' | 'response' | 'emit' | 'observe';

    constructor(init: {
        context: InvocationContext;
        method?: string;
        headers?: HeadersLike;
        payload?: T;
        /**
         * response observe type
         */
        observe?: 'body' | 'events' | 'response' | 'emit' | 'observe';
        /**
         * response data type.
         */
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    }, options?: PacketOpts) {
        super(init, options)
        this.context = init.context;
        this.method = init.method ?? this.headers.getMethod() ?? options?.defaultMethod ?? '';
        this.responseType = init.responseType ?? 'json';
        this.observe = init.observe ?? 'body';
    }

    abstract clone(): AbstractRequest<T>;
    abstract clone(update: {
        headers?: TransportHeaders;
        context?: InvocationContext<any>;
        method?: string;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        pattern?: Pattern;
        body?: T | null;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
        timeout?: number | null;
    }): AbstractRequest<T>
    abstract clone<V>(update: {
        headers?: TransportHeaders;
        context?: InvocationContext<any>;
        method?: string;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        pattern?: Pattern;
        body?: V | null;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
        timeout?: number | null;
    }): AbstractRequest<V>;

}


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
export interface RequestInitOpts<T = any> extends RequestOptions<T>, ResponseAs, PacketOpts {
    /**
     * request context.
     */
    context: InvocationContext;
}


/**
 * url Request.
 */
export class UrlRequest<T = any> extends AbstractRequest<T> {
    readonly params: TransportParams;

    readonly reportProgress: boolean;
    readonly withCredentials: boolean;
    readonly url: string;
    readonly urlWithParams: string | undefined;

    get body(): T | null {
        return this.payload;
    }

    /**
     * client side timeout.
     */
    readonly timeout?: number;

    constructor(url: string, options: RequestInitOpts<T>) {
        super(options, options)
        this.params = new TransportParams(options);
        this.reportProgress = !!options.reportProgress;
        this.withCredentials = !!options.withCredentials;
        this.timeout = options.timeout;

        this.url = url;
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

    clone(): UrlRequest<T>;
    clone(update: {
        headers?: TransportHeaders;
        context?: InvocationContext<any>;
        method?: string;
        params?: TransportParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        url?: string;
        body?: T | null;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
        timeout?: number | null;
    }): UrlRequest<T>
    clone<V>(update: {
        headers?: TransportHeaders;
        context?: InvocationContext<any>;
        method?: string;
        params?: TransportParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';

        body?: V | null;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
        timeout?: number | null;
    }): UrlRequest<V>;
    clone(update: {
        headers?: TransportHeaders;
        context?: InvocationContext<any>;
        method?: string;
        params?: TransportParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        url?: string;
        body?: any;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
        timeout?: number | null;
    } = {}): UrlRequest {
        const url = update.url || this.url;
        const responseType = update.responseType || this.responseType;
        const observe = this.observe;
        const method = update.method ?? this.method;
        // The payload is somewhat special - a `null` value in update.payload means
        // whatever current payload is present is being overridden with an empty
        // payload, whereas an `undefined` value in update.payload implies no
        // override.
        let payload = isUndefined(update.payload) ? update.body : update.payload;
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
        return new UrlRequest(url, {
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


/**
 * Pattern Request.
 */
export class PatternRequest<T = any> extends AbstractRequest<T> {

    readonly pattern: Pattern;
    readonly params: TransportParams;

    get body(): T | null {
        return this.payload;
    }

    /**
     * client side timeout.
     */
    readonly timeout?: number;

    constructor(pattern: Pattern, options: RequestInitOpts<T>) {
        super(options, options)
        this.params = new TransportParams(options);
        this.timeout = options.timeout;

        this.pattern = pattern;
    }

    clone(): PatternRequest<T>;
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
    }): PatternRequest<T>
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
    }): PatternRequest<V>;
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
    } = {}): PatternRequest {
        const pattern = update.pattern || this.pattern;
        const responseType = update.responseType || this.responseType;
        const observe = this.observe;
        const method = update.method ?? this.method;
        // The payload is somewhat special - a `null` value in update.payload means
        // whatever current payload is present is being overridden with an empty
        // payload, whereas an `undefined` value in update.payload implies no
        // override.
        let payload = isUndefined(update.payload) ? update.body : update.payload;
        if (isUndefined(payload)) {
            payload = this.payload;
        }

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
        return new PatternRequest(pattern, {
            payload,
            method,
            params,
            headers,
            responseType,
            observe,
            context,
            timeout
        })
    }
}

