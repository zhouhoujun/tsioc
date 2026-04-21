import { HeadersLike, HeaderMappings } from './headers';
import { ParameterCodec, RequestParams, RequestParamsLike } from './params';
import { Pattern, PatternFormatter } from './pattern';
import { Clonable } from './Clonable';
import { RequestContext } from './context';
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
     * request context.
     */
    context?: RequestContext;
    /**
     * parameter codec.
     */
    encoder?: ParameterCodec;
    /**
     * for restful
     */
    withCredentials?: boolean;
}
export interface CloneExtendOpts {
    setHeaders?: {
        [name: string]: string | string[];
    };
    setParams?: {
        [param: string]: string;
    };
}
/**
 * Request clone options.
 */
export type RequestCloneOpts<T, TOptions extends RequestOptions> = TOptions & PayloadOptions<T> & CloneExtendOpts & ResponseAs;
/**
 * Request clone options.
 */
export type RequestInitOpts<T, TOptions extends RequestOptions> = TOptions & PayloadOptions<T> & CloneExtendOpts & ResponseAs;
/**
 * Abstract request.
 */
export declare abstract class AbstractRequest<T, TOptions extends RequestOptions = RequestOptions<T>> implements Clonable<AbstractRequest<T>> {
    id?: string | number;
    /**
     * request headers.
     */
    abstract get headers(): HeaderMappings;
    abstract get params(): RequestParams;
    /**
     * force parse response type as Json or not.
     */
    abstract get forceJson(): boolean;
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
    get body(): T | null;
    /**
     * request payload.
     */
    abstract get payload(): T | null;
    abstract clone(): AbstractRequest<T>;
    abstract clone<V>(update: RequestCloneOpts<V, TOptions>): AbstractRequest<V>;
    abstract clone(update: RequestCloneOpts<T, TOptions>): AbstractRequest<T>;
    /**
     * parse request to simple json.
     * @param optoions json format options
     * @returns
     */
    abstract toJson(optoions?: JsonFormatOptions): Record<string, any>;
}
export interface JsonFormatOptions {
    /**
     * pattern formatter.
     */
    formatter?: PatternFormatter;
    /**
     * payload key. default is 'body'.
     */
    payloadKey?: 'body' | 'payload';
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
export declare abstract class UrlRequest<T = any, TOptions extends UrlRequestOptions = UrlRequestOptions<T>> extends AbstractRequest<T, TOptions> {
    /**
     * pattern
     */
    readonly pattern?: Pattern | null;
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
export declare abstract class TopicRequest<T = any, TOptions extends TopicRequestOptions = TopicRequestOptions<T>> extends AbstractRequest<T, TOptions> {
    /**
     * pattern
     */
    readonly pattern?: Pattern | null;
    /**
     * the outgoing topic.
     */
    abstract get topic(): string;
    abstract get responseTopic(): string;
}
/**
 * Pattern request
 */
export declare abstract class PatternRequest<T = any, TOptions extends TopicRequestOptions = TopicRequestOptions<T>> extends AbstractRequest<T, TOptions> {
    /**
     * the outgoing topic.
     */
    abstract get pattern(): Pattern;
}
/**
 * Request packet.
 */
export declare abstract class BaseRequest<T, TOptions extends RequestOptions<T> = RequestOptions<T>> extends AbstractRequest<T, TOptions> {
    protected initOptions: RequestInitOpts<T, TOptions>;
    readonly headers: HeaderMappings;
    readonly params: RequestParams;
    readonly responseType: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    readonly observe: 'body' | 'events' | 'response' | 'emit' | 'observe';
    readonly withCredentials: boolean | undefined;
    readonly payload: T | null;
    readonly forceJson: boolean;
    /**
     * set request timeout times (ms).
     */
    readonly timeout: number | undefined;
    /**
     * request body, payload alias name.
     */
    get body(): T | null;
    protected queryParams?: boolean;
    constructor(initOptions: RequestInitOpts<T, TOptions>, defaultMethod?: string);
    getExtentOptions(): any;
    protected cloneOpts(update: RequestCloneOpts<any, TOptions>): RequestInitOpts<any, TOptions>;
}
export declare function appendUrlParams(url: string, reqParams: RequestParams): string;
/**
 * Base url request
 */
export declare abstract class BaseUrlRequest<T, TOptions extends UrlRequestOptions = UrlRequestOptions<T>> extends BaseRequest<T, TOptions> implements UrlRequest<T, TOptions> {
    readonly url: string;
    readonly pattern: Pattern | null | undefined;
    readonly method: string;
    constructor(url: string, pattern: Pattern | null | undefined, init: RequestInitOpts<T, TOptions>, defaultMethod?: string);
    abstract clone(): BaseUrlRequest<T>;
    abstract clone<V>(update: RequestCloneOpts<V, TOptions>): BaseUrlRequest<V>;
    abstract clone(update: RequestCloneOpts<T, TOptions>): BaseUrlRequest<T>;
    protected cloneOpts(update: RequestCloneOpts<any, TOptions>): RequestInitOpts<any, TOptions>;
    /**
     * The outgoing URL with all URL parameters set.
     */
    getUrlWithParams(): string;
    /**
     * parse request to simple json.
     * @param optoions json format options
     * @returns
     */
    toJson(optoions?: JsonFormatOptions): Record<string, any>;
}
export declare abstract class BaseTopicRequest<T, TOptions extends TopicRequestOptions = TopicRequestOptions<T>> extends BaseRequest<T, TOptions> implements TopicRequest<T, TOptions> {
    readonly pattern: Pattern | null | undefined;
    readonly responseTopic: string;
    readonly topic: string;
    constructor(topic: string, pattern: Pattern | null | undefined, init: RequestInitOpts<T, TOptions>, defaultMethod?: string);
    protected getResponseTopic(topic: string, options: RequestInitOpts<T, TOptions>): string;
    /**
     * parse request to simple json.
     * @param optoions json format options
     * @returns
     */
    toJson(options?: JsonFormatOptions): Record<string, any>;
    abstract clone(): BaseTopicRequest<T>;
    abstract clone<V>(update: RequestCloneOpts<V, TOptions>): BaseTopicRequest<V, TOptions>;
    abstract clone(update: RequestCloneOpts<T, TOptions>): BaseTopicRequest<T, TOptions>;
}
