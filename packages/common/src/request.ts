import { InvocationContext, isNil, isUndefined } from '@tsdi/ioc';
import { HeadersLike, HeaderMappings } from './headers';
import { ParameterCodec, RequestParams, RequestParamsLike } from './params';
import { Clonable, CloneOpts, Packet, PacketOpts } from './packet';
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
    params?: RequestParamsLike;

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
}



export interface RequestInitOpts<T = any> extends RequestPacketOpts<T>, ResponseAs {
    /**
     * request context.
     */
    context: InvocationContext;
}

export interface RequestCloneOpts<T> extends CloneOpts<T> {
    params?: RequestParams;
    context?: InvocationContext;
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    method?: string;
    setParams?: { [param: string]: string; };
    withCredentials?: boolean;
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
    abstract get withCredentials(): boolean | undefined;

    /**
     * request body, payload alias name.
     */
    get body(): T | null {
        return this.payload;
    }

    abstract clone(): AbstractRequest<T>;
    abstract clone<V>(update: RequestCloneOpts<V>): AbstractRequest<V>;
    abstract clone(update: RequestCloneOpts<T>): AbstractRequest<T>;

}


export interface UrlRequestCloneOpts<T> extends RequestCloneOpts<T> {
    url?: string;
}

/**
 * url request.
 */
export abstract class UrlRequest<T> extends AbstractRequest<T> {
    /**
     * The outgoing url.
     */
    abstract get url(): string;

    /**
     * The outgoing URL with all URL parameters set.
     */
    abstract get urlWithParams(): string;
}

export interface TopicRequestCloneOpts<T> extends RequestCloneOpts<T> {
    topic?: string;
}

/**
 * Topic request
 */
export abstract class TopicRequest<T> extends AbstractRequest<T> {
    /**
     * the outgoing topic.
     */
    abstract get topic(): string;
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
    readonly withCredentials: boolean | undefined;
    override readonly payload: T | null;
    /**
     * request body, payload alias name.
     */
    get body(): T | null {
        return this.payload;
    }

    protected queryParams?: boolean;

    constructor(init: RequestInitOpts, defaultMethod = '') {
        super()
        this.id = init.id;
        this.headers = new HeaderMappings(init.headers, init.headerFields);
        this.payload = init.payload ?? null;
        this.payload = init.body ?? init.payload ?? null;
        this.params = new RequestParams(init);
        this.method = init.method ?? defaultMethod;
        this.context = init.context;
        this.responseType = init.responseType ?? 'json';
        this.observe = init.observe ?? 'body';
        this.withCredentials = !!init.withCredentials;

    }

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

    protected cloneOpts(update: RequestCloneOpts<any>): RequestInitOpts<any> {

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
        const context = update.context ?? this.context;
        return { id, headers, params, payload, method, withCredentials, context };
    }

    protected toRecord(): Record<string, any> {
        const record = {} as Record<string, any>;
        if (this.id) record.id = this.id;
        // if (this.pattern) record.pattern = this.pattern;
        if (this.headers.size) record.headers = this.headers.getHeaders();
        if (!isNil(this.payload)) record.payload = this.payload;
        if (this.method) record.method = this.method;
        if (!this.queryParams) record.params = this.params.toRecord();
        if (!isNil(this.withCredentials)) record.withCredentials = this.withCredentials;
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

export abstract class BaseUrlRequest<T> extends BaseRequest<T> implements UrlRequest<T> {

    /**
     * The outgoing URL with all URL parameters set.
     */
    readonly urlWithParams: string;

    constructor(readonly url: string, readonly pattern: Pattern | null | undefined, init: RequestInitOpts<T>, defaultMethod = '') {
        super(init, defaultMethod);

        if (pattern) {
            this.queryParams = false;
            this.urlWithParams = this.url;
        } else {
            this.queryParams = true;
            this.urlWithParams = this.appendUrlParams();
        }
    }

    abstract clone(): BaseUrlRequest<T>;
    abstract clone<V>(update: UrlRequestCloneOpts<V>): BaseUrlRequest<V>;
    abstract clone(update: UrlRequestCloneOpts<T>): BaseUrlRequest<T>;

    protected appendUrlParams() {
        return appendUrlParams(this.url, this.params);
    }

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.url = this.queryParams ? this.urlWithParams : this.url;
        return rcd;
    }
}

export abstract class BaseTopicRequest<T> extends BaseRequest<T> implements TopicRequest<T> {

    constructor(readonly topic: string, readonly pattern: Pattern | null | undefined, init: RequestInitOpts<T>, defaultMethod = '') {
        super(init, defaultMethod);
    }

    abstract clone(): BaseTopicRequest<T>;
    abstract clone<V>(update: TopicRequestCloneOpts<V>): BaseTopicRequest<V>;
    abstract clone(update: TopicRequestCloneOpts<T>): BaseTopicRequest<T>;

    protected override toRecord(): Record<string, any> {
        const rcd = super.toRecord();
        rcd.topic = this.topic;
        return rcd;
    }
}