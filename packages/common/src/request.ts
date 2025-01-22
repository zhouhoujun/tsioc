import { InvocationContext, isUndefined } from '@tsdi/ioc';
import { HeadersLike, HeaderMappings } from './headers';
import { ParameterCodec, RequestParams, RequestParamsLike } from './params';
import { Pattern } from './pattern';
import { Clonable } from './Clonable';



/**
 * Response option for request.
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

export interface RequestWithContext {

    /**
     * request context.
     */
    context: InvocationContext;
}

export interface PayloadOptions<T = any> {
    /**
     * request payload, request body.
     */
    payload?: T;
    /**
     * request body. alias of payload.
     */
    body?: T | null;
}

/**
 * Request packet options.
 */
export interface RequestOptions<T = any> extends PayloadOptions<T> {
    id?: any;
    /**
     * headers of request.
     */
    headers?: HeadersLike;
    /**
     * request params.
     */
    params?: RequestParamsLike;

    /**
     * parameter codec.
     */
    encoder?: ParameterCodec;

    /**
     * request context.
     */
    context?: InvocationContext;
    /**
     * for restful
     */
    withCredentials?: boolean;
    /**
     * set request timeout times (ms).
     */
    timeout?: number;
}





export interface CloneExtendOpts {
    setHeaders?: { [name: string]: string | string[]; };
    setParams?: { [param: string]: string; };
}


/**
 * Request clone options.
 */
export type RequestCloneOpts<T, TOptions extends RequestOptions> = TOptions & PayloadOptions<T> & CloneExtendOpts & ResponseAs;

/**
 * Request clone options.
 */
export type RequestInitOpts<T, TOptions extends RequestOptions> = Required<RequestWithContext> & TOptions & PayloadOptions<T> & CloneExtendOpts & ResponseAs;

/**
 * Abstract request.
 */
export abstract class AbstractRequest<T, TOptions extends RequestOptions = RequestOptions<T>> implements Clonable<AbstractRequest<T>> {

    id?: string | number;
    /**
     * request headers.
     */
    abstract get headers(): HeaderMappings;
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
    abstract get withCredentials(): boolean | undefined;


    /**
     * set request timeout times (ms).
     */
    abstract get timeout(): number | undefined;

    /**
     * request body, payload alias name.
     */
    get body(): T | null {
        return this.payload
    }
    /**
     * request payload.
     */
    abstract get payload(): T | null;

    abstract clone(): AbstractRequest<T>;
    abstract clone<V>(update: RequestCloneOpts<V, TOptions>): AbstractRequest<V>;
    abstract clone(update: RequestCloneOpts<T, TOptions>): AbstractRequest<T>;

}


/**
 * url request options
 */
export interface UrlRequestOptions<T = any> extends RequestOptions<T> {
    /**
     * request url.
     */
    url?: string;
    /**
     * request method.
     */
    method?: string;
    /**
     * for restful
     */
    reportProgress?: boolean;
}


/**
 * url request.
 */
export abstract class UrlRequest<T = any, TOptions extends UrlRequestOptions = UrlRequestOptions<T>> extends AbstractRequest<T, TOptions> {
    /**
     * The outgoing url.
     */
    abstract get url(): string;

    /**
     * request method.
     */
    abstract get method(): string;

    /**
     * The outgoing URL with all URL parameters set.
     */
    abstract getUrlWithParams(): string;
}


/**
 * topic options
 */
export interface TopicRequestOptions<T = any> extends RequestOptions<T> {
    topic?: string;
}


/**
 * Topic request
 */
export abstract class TopicRequest<T = any, TOptions extends TopicRequestOptions = TopicRequestOptions<T>> extends AbstractRequest<T, TOptions> {
    /**
     * the outgoing topic.
     */
    abstract get topic(): string;
}


/**
 * Pattern request
 */
export abstract class PatternRequest<T = any, TOptions extends TopicRequestOptions = TopicRequestOptions<T>> extends AbstractRequest<T, TOptions> {
    /**
     * the outgoing topic.
     */
    abstract get pattern(): Pattern;
}



/**
 * Request packet.
 */
export abstract class BaseRequest<T, TOptions extends RequestOptions<T> = RequestOptions<T>> extends AbstractRequest<T, TOptions> {
    readonly headers: HeaderMappings;
    readonly params: RequestParams;
    readonly context: InvocationContext;
    readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    readonly observe: 'body' | 'events' | 'response' | 'emit' | 'observe';
    readonly withCredentials: boolean | undefined;
    readonly payload: T | null;
    /**
     * set request timeout times (ms).
     */
    readonly timeout: number | undefined;
    /**
     * request body, payload alias name.
     */
    get body(): T | null {
        return this.payload;
    }

    protected queryParams?: boolean;

    constructor(init: RequestInitOpts<T, TOptions>, defaultMethod = '') {
        super()
        this.id = init.id;
        this.headers = new HeaderMappings(init.headers);
        this.payload = init.payload ?? null;
        this.payload = init.body ?? init.payload ?? null;
        this.params = new RequestParams(init);
        this.context = init.context;
        this.responseType = init.responseType ?? 'json';
        this.observe = init.observe ?? 'body';
        this.withCredentials = !!init.withCredentials;
        this.timeout = init.timeout;

    }

    protected cloneOpts(update: RequestCloneOpts<any, TOptions>): RequestInitOpts<any, TOptions> {

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


        // `setParams` are used.

        let params: RequestParams;
        if (update.params) {
            params = update.params instanceof RequestParams ? update.params : new RequestParams(update);
        } else {
            params = this.params;
        }

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
        const timeout = update.timeout ?? this.timeout;
        const id = this.id;
        const context = update.context ?? this.context;
        return { id, headers, params, payload, withCredentials, context, timeout } as RequestInitOpts<any, TOptions>;
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
 * Base url request
 */
export abstract class BaseUrlRequest<T, TOptions extends UrlRequestOptions = UrlRequestOptions<T>> extends BaseRequest<T, TOptions> implements UrlRequest<T, TOptions> {

    readonly method: string;
    constructor(readonly url: string, readonly pattern: Pattern | null | undefined, init: RequestInitOpts<T, TOptions>, defaultMethod = '') {
        super(init, defaultMethod);
        this.method = init.method ?? defaultMethod;

    }

    abstract clone(): BaseUrlRequest<T>;
    abstract clone<V>(update: RequestCloneOpts<V, TOptions>): BaseUrlRequest<V>;
    abstract clone(update: RequestCloneOpts<T, TOptions>): BaseUrlRequest<T>;


    protected override cloneOpts(update: RequestCloneOpts<any, TOptions>): RequestInitOpts<any, TOptions> {
        const opts = super.cloneOpts(update) as RequestInitOpts<any, TOptions>;
        opts.method = update.method ?? this.method;
        return opts;
    }

    /**
     * The outgoing URL with all URL parameters set.
     */
    getUrlWithParams(): string {
        return appendUrlParams(this.url, this.params);
    }
}

export abstract class BaseTopicRequest<T, TOptions extends TopicRequestOptions = TopicRequestOptions<T>> extends BaseRequest<T, TOptions> implements TopicRequest<T, TOptions> {
    readonly replyTopic: string | undefined;
    constructor(readonly topic: string, readonly pattern: Pattern | null | undefined, init: RequestInitOpts<T, TOptions>, defaultMethod = '') {
        super(init, defaultMethod);
        this.replyTopic = this.getResponseTopic(topic, init);
    }

    protected getResponseTopic(topic: string, options: RequestInitOpts<T, TOptions>): string {
        return `${topic}\reply`
    }


    abstract clone(): BaseTopicRequest<T>;
    abstract clone<V>(update: RequestCloneOpts<V, TOptions>): BaseTopicRequest<V, TOptions>;
    abstract clone(update: RequestCloneOpts<T, TOptions>): BaseTopicRequest<T, TOptions>;

}