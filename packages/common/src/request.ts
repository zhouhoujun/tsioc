import { InvocationContext, isNil, isUndefined } from '@tsdi/ioc';
import { HeadersLike, HeaderMappings } from './headers';
import { ParameterCodec, RequestParams } from './params';
import { Clonable, Packet, PacketOpts } from './packet';
import { Pattern } from './pattern';



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

export interface RequestPacketOpts<T = any> extends PacketOpts<T> {

    /**
     * request method.
     */
    method?: string;
    /**
     * headers of request.
     */
    headers?: HeadersLike;
    /**
     * request params.
     */
    params?: RequestParams | string
    | ReadonlyArray<[string, string | number | boolean]>
    | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;

    /**
     * parameter codec.
     */
    encoder?: ParameterCodec;

    /**
     * request payload, request body.
     */
    payload?: T;
    /**
     * request body. alias of payload.
     */
    body?: T | null;
    /**
     * for restful
     */
    withCredentials?: boolean;
    /**
     * default method.
     */
    defaultMethod?: string;
}



export interface RequestInitOpts<T = any> extends RequestPacketOpts<T>, ResponseAs {
    /**
     * request context.
     */
    context: InvocationContext;
}

/**
 * Abstract request.
 */
export abstract class AbstractRequest<T> extends Packet<T> implements Clonable<AbstractRequest<T>> {
    abstract get method(): string;
    abstract get params(): RequestParams;
    abstract get context(): InvocationContext;
    /**
     * The expected response type of the server.
     *
     * This is used to parse the response appropriately before returning it to
     * the requestee.
     */
    abstract get responseType(): 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    abstract get observe(): 'body' | 'events' | 'response' | 'emit' | 'observe';
    /**
     * Whether this request should be sent with outgoing credentials (cookies).
     */
    abstract get withCredentials(): boolean;

    /**
     * request body, payload alias name.
     */
    get body(): T | null {
        return this.payload;
    }

    abstract clone(): AbstractRequest<T>;
    abstract clone<V>(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        context?: InvocationContext<any>;
        method?: string;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        body?: V | null;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
    }): AbstractRequest<V>;
    abstract clone(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        context?: InvocationContext;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        body?: T | null;
        payload?: T | null;
        method?: string;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
    }): AbstractRequest<T>;

}


/**
 * Request packet.
 */
export abstract class BaseRequest<T> extends AbstractRequest<T> {

    readonly method: string;
    readonly headers: HeaderMappings;
    readonly params: RequestParams;
    readonly context: InvocationContext;
    readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    readonly observe: 'body' | 'events' | 'response' | 'emit' | 'observe';
    readonly withCredentials: boolean;
    override readonly payload: T | null;
    /**
     * request body, payload alias name.
     */
    get body(): T | null {
        return this.payload;
    }

    constructor(init: RequestInitOpts) {
        super()
        this.id = init.id;
        this.headers = new HeaderMappings(init.headers, init.headerFields);
        this.payload = init.payload ?? null;
        this.payload = init.body ?? init.payload ?? null;
        this.params = new RequestParams(init);
        this.method = init.method ?? this.headers.getMethod() ?? init.defaultMethod ?? '';
        this.context = init.context;
        this.responseType = init.responseType ?? 'json';
        this.observe = init.observe ?? 'body';
        this.withCredentials = !!init.withCredentials;
    }

    abstract clone(): AbstractRequest<T>;
    abstract clone<V>(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        context?: InvocationContext<any>;
        method?: string;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        body?: V | null;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
    }): AbstractRequest<V>;
    abstract clone(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        context?: InvocationContext;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        body?: T | null;
        payload?: T | null;
        method?: string;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
    }): AbstractRequest<T>;

    toJson(ignores?: string[]): Record<string, any> {
        const obj = this.toRecord();
        if (!ignores) return obj;

        const record = {} as Record<string, any>;
        for (const n in obj) {
            if (ignores.indexOf(n) < 0
                && !isNil(obj[n])) {
                record[n] = obj[n];
            }
        }
        return record;
    }

    attachId(id: string | number) {
        this.id = id;
    }

    protected cloneOpts(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        context?: InvocationContext;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        withCredentials?: boolean;
        body?: any;
        payload?: any;
        method?: string;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
    }): any {

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
        let headers: HeaderMappings;
        if (update.headers instanceof HeaderMappings) {
            headers = update.headers;
        } else {
            headers = this.headers;
            update.headers && headers.setHeaders(update.headers);
        }
        // Check whether the caller has asked to add headers.
        if (update.setHeaders !== undefined) {
            // Set every requested header.
            headers =
                Object.keys(update.setHeaders)
                    .reduce((headers, name) => headers.set(name, update.setHeaders![name]), headers)
        }

        const method = update.method ?? this.method;
        // `setParams` are used.
        let params = update.params || this.params;

        // Check whether the caller has asked to set params.
        if (update.setParams) {
            // Set every requested param.
            params = Object.keys(update.setParams)
                .reduce((params, param) => params.set(param, update.setParams![param]), params)
        }

        // Carefully handle the boolean options to differentiate between
        // `false` and `undefined` in the update args.
        const withCredentials =
            (update.withCredentials !== undefined) ? update.withCredentials : this.withCredentials;
        const id = this.id;
        return { id, headers, params, payload, method, withCredentials };
    }

    protected toRecord(): Record<string, any> {
        const record = {} as Record<string, any>;
        if (this.id) {
            record.id = this.id;
        }
        if (this.headers.size) {
            record.headers = this.headers.getHeaders();
        }
        if (!isNil(this.payload)) {
            record.payload = this.payload;
        }
        if (this.params.size) record.params = this.params.toRecord();
        if (this.method) record.method = this.method;
        record.withCredentials = this.withCredentials;
        return record;
    }

}

export function appendUrlParams(url: string, reqParams: RequestParams) {
    // If no parameters have been passed in, construct a new HttpUrlEncodedParams instance.
    if (!reqParams.size) {
        return url
    } else {
        // Encode the parameters to a string in preparation for inclusion in the URL.
        const params = reqParams.toString();
        if (params.length === 0) {
            // No parameters, the visible URL is just the URL given at creation time.
            return url
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
            return url + sep + params
        }

    }
}

/**
 * request options
 */
export interface RequestOptions<T = any> extends RequestPacketOpts<T> {
    /**
     * request context.
     */
    context?: InvocationContext;
    /**
     * for restful
     */
    reportProgress?: boolean;
}



/**
 * Request init options.
 */
export interface UrlRequestInitOpts<T = any> extends RequestOptions<T>, RequestInitOpts<T> {
    /**
     * request context.
     */
    context: InvocationContext;
}


/**
 * url Request.
 */
export class UrlRequest<T> extends BaseRequest<T> {

    readonly reportProgress: boolean;
    readonly url: string;
    readonly urlWithParams: string | undefined;

    constructor(url: string, options: UrlRequestInitOpts<T>) {
        super(options)
        this.reportProgress = !!options.reportProgress;

        this.url = url;
        this.urlWithParams = appendUrlParams(url, this.params);
    }

    clone(): UrlRequest<T>;
    clone<V>(update: {
        headers?: HeaderMappings;
        context?: InvocationContext<any>;
        method?: string;
        params?: RequestParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        body?: V | null;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
    }): UrlRequest<V>;
    clone(update: {
        headers?: HeaderMappings;
        context?: InvocationContext<any>;
        method?: string;
        params?: RequestParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        url?: string;
        body?: T | null;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
    }): UrlRequest<T>
    clone(update: {
        headers?: HeaderMappings;
        context?: InvocationContext<any>;
        method?: string;
        params?: RequestParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        url?: string;
        body?: any;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
    } = {}): UrlRequest<any> {
        const url = update.url || this.url;

        const init = this.cloneOpts(update);

        // Finally, construct the new HttpRequest using the pieces from above.
        return new UrlRequest(url, init)
    }

    protected override cloneOpts(update: {
        headers?: HeaderMappings;
        context?: InvocationContext<any>;
        method?: string;
        params?: RequestParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        url?: string;
        body?: any;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        reportProgress?: boolean;
        withCredentials?: boolean;
    }): UrlRequestInitOpts {
        const init = super.cloneOpts(update) as UrlRequestInitOpts;
        init.reportProgress =
            (update.reportProgress !== undefined) ? update.reportProgress : this.reportProgress;

        return init;

    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.url = this.urlWithParams;
        return rcd;
    }
}


/**
 * Pattern Request.
 */
export class PatternRequest<T = any> extends BaseRequest<T> {

    readonly pattern: Pattern;
    readonly params: RequestParams;
    readonly withCredentials: boolean;

    /**
     * client side timeout.
     */
    readonly timeout?: number;

    constructor(pattern: Pattern, options: RequestInitOpts<T>) {
        super(options)
        this.params = new RequestParams(options);
        this.withCredentials = !!options.withCredentials;
        this.pattern = pattern;
    }

    clone(): PatternRequest<T>;
    clone<V>(update: {
        headers?: HeadersLike;
        context?: InvocationContext<any>;
        method?: string;
        params?: RequestParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        pattern?: Pattern;
        body?: V | null;
        payload?: V | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        withCredentials?: boolean;
    }): PatternRequest<V>;
    clone(update: {
        headers?: HeadersLike;
        context?: InvocationContext<any>;
        method?: string;
        params?: RequestParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        pattern?: Pattern;
        body?: T | null;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        withCredentials?: boolean;
    }): PatternRequest<T>;
    clone(update: {
        headers?: HeadersLike;
        context?: InvocationContext<any>;
        method?: string;
        params?: RequestParams;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        pattern?: Pattern;
        body?: any;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        withCredentials?: boolean;
    } = {}): PatternRequest {
        const pattern = update.pattern || this.pattern;

        const options = this.cloneOpts(update);
        // Finally, construct the new HttpRequest using the pieces from above.
        return new PatternRequest(pattern, options)
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.pattern = this.pattern;
        return rcd;
    }
}

