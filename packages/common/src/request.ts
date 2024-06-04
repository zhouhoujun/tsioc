import { InvocationContext } from '@tsdi/ioc';
import { HeadersLike, HeaderMappings } from './headers';
import { ParameterCodec, RequestParams } from './params';
import { Packet, PacketInitOpts, PacketOpts } from './packet';
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

export interface RequestPacketOpts<T = any> extends PacketInitOpts<T>, PacketOpts {

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
     * request timeout
     */
    timeout?: number;
    /**
     * for restful
     */
    withCredentials?: boolean;
}



export interface RequestInitOpts<T = any> extends RequestPacketOpts<T>, ResponseAs {
    /**
     * request context.
     */
    context: InvocationContext;
}

/**
 * Request packet.
 */
export abstract class AbstractRequest<T = any> extends Packet<T> {

    /**
     * client side timeout.
     */
    readonly timeout?: number;
    readonly method: string;
    readonly params: RequestParams;
    readonly context: InvocationContext;
    readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    readonly observe: 'body' | 'events' | 'response' | 'emit' | 'observe';
    readonly withCredentials: boolean;

    /**
     * request body, payload alias name.
     */
    get body(): T | null {
        return this.payload;
    }

    constructor(init: RequestInitOpts) {
        super(init)

        this.params = new RequestParams(init);
        this.method = init.method ?? this.headers.getMethod() ?? init.defaultMethod ?? '';
        this.timeout = init.timeout;
        this.context = init.context;
        this.responseType = init.responseType ?? 'json';
        this.observe = init.observe ?? 'body';
        this.withCredentials = !!init.withCredentials;
    }

    abstract clone(): AbstractRequest<T>;
    abstract clone(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        context?: InvocationContext<any>;
        method?: string;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        body?: T | null;
        payload?: T | null;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        timeout?: number | null;
    }): AbstractRequest<T>
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
        timeout?: number | null;
    }): AbstractRequest<V>;

    protected override cloneOpts(update: {
        headers?: HeadersLike;
        params?: RequestParams;
        context?: InvocationContext<any>;
        method?: string;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
        body?: any;
        payload?: any;
        setHeaders?: { [name: string]: string | string[]; };
        setParams?: { [param: string]: string; };
        timeout?: number | null;
        withCredentials?: boolean;
    }): RequestInitOpts {
        const init = super.cloneOpts(update) as RequestInitOpts;
        init.method = update.method ?? this.method;
        // `setParams` are used.
        let params = update.params || this.params;

        // Check whether the caller has asked to set params.
        if (update.setParams) {
            // Set every requested param.
            params = Object.keys(update.setParams)
                .reduce((params, param) => params.set(param, update.setParams![param]), params)
        }
        init.params = params;
        // Carefully handle the boolean options to differentiate between
        // `false` and `undefined` in the update args.
        init.withCredentials =
            (update.withCredentials !== undefined) ? update.withCredentials : this.withCredentials;
        return init;
    }

    override toJson(): Record<string, any> {
        const rcd = super.toJson();
        if (this.params.size) rcd.params = this.params.toRecord();
        if (this.method) rcd.method = this.method;
        if (this.timeout) rcd.timeout = this.timeout;
        rcd.withCredentials = this.withCredentials;
        return rcd;
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
export class UrlRequest<T = any> extends AbstractRequest<T> {

    readonly reportProgress: boolean;
    readonly url: string;
    readonly urlWithParams: string | undefined;

    constructor(url: string, options: UrlRequestInitOpts<T>) {
        super(options)
        this.reportProgress = !!options.reportProgress;

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
        timeout?: number | null;
    }): UrlRequest<T>
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
        timeout?: number | null;
    }): UrlRequest<V>;
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
        timeout?: number | null;
    } = {}): UrlRequest {
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
        timeout?: number | null;
    }): UrlRequestInitOpts {
        const init = super.cloneOpts(update) as UrlRequestInitOpts;
        init.reportProgress =
            (update.reportProgress !== undefined) ? update.reportProgress : this.reportProgress;

        return init;

    }

    override toJson(): Record<string, any> {
        const rcd = super.toJson();
        rcd.url = this.urlWithParams;
        return rcd;
    }
}


/**
 * Pattern Request.
 */
export class PatternRequest<T = any> extends AbstractRequest<T> {

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
        this.timeout = options.timeout;
        this.withCredentials = !!options.withCredentials;
        this.pattern = pattern;
    }

    clone(): PatternRequest<T>;
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
        timeout?: number | null;
    }): PatternRequest<T>
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
        timeout?: number | null;
    }): PatternRequest<V>;
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
        timeout?: number | null;
    } = {}): PatternRequest {
        const pattern = update.pattern || this.pattern;

        const options = this.cloneOpts(update);
        // Finally, construct the new HttpRequest using the pieces from above.
        return new PatternRequest(pattern, options)
    }

    override toJson(): Record<string, any> {
        const rcd = super.toJson();
        rcd.pattern = this.pattern;
        return rcd;
    }
}

