import { StaticProvider } from '@tsdi/ioc';
import { BaseIncoming, Incoming, IncomingMessage, ClientIncoming, TopicIncoming, UrlIncoming } from './incoming';
import { HeaderMappings, HeadersLike } from './headers';
import { ParameterCodec } from './params';
import { IReadable, ReadableLike } from './stream';
import { StreamAdapter } from './StreamAdapter';
import { StatusOptions } from './response';
/**
 * Abstract incoming factory.
 */
export declare abstract class AbstractIncomingFactory<T extends IncomingMessage = IncomingMessage> {
    abstract create(options: any): ReadableLike<T>;
}
/**
 * server incoming factory.
 */
export declare abstract class IncomingFactory implements AbstractIncomingFactory<Incoming<any>> {
    abstract create(options: IncomingOpts): ReadableLike<Incoming<any>>;
}
/**
 * Client incoming factory.
 */
export declare abstract class ClientIncomingFactory implements AbstractIncomingFactory<ClientIncoming> {
    abstract create(options: ClientIncomingOpts): ReadableLike<ClientIncoming>;
}
/**
 * incoming options
 */
export interface BasicIncomingOpts<T = any> {
    id?: any;
    /**
     * pattern.
     */
    pattern?: string;
    /**
     * headers of request.
     */
    headers?: HeadersLike;
    /**
     * request query params.
     */
    params?: Record<string, any>;
    /**
     * request query params.
     */
    query?: Record<string, any>;
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
    streamLength?: number;
}
/**
 * Url incoming options.
 */
export interface UrlIncomingOptions<T = any> extends BasicIncomingOpts<T> {
    /**
     * request url.
     */
    url: string;
    /**
     * request method.
     */
    method?: string;
    /**
     * for restful
     */
    withCredentials?: boolean;
    defaultMethod?: string;
}
/**
 * Topic incoming options.
 */
export interface TopicIncomingOptions<T = any> extends BasicIncomingOpts<T> {
    /**
     * request url.
     */
    topic: string;
    /**
     * response topic.
     */
    responseTopic?: string;
}
/**
 * Stream incoming options.
 */
export interface StreamIncomingOptions<T = any> extends BasicIncomingOpts<T> {
    req: any;
    res: any;
}
/**
 * incoming options
 */
export type IncomingOpts<T = any> = UrlIncomingOptions<T> | TopicIncomingOptions<T> | StreamIncomingOptions<T>;
/**
 * Incoming base packet.
 */
export declare abstract class AbstractIncoming<T> implements BaseIncoming<T> {
    readonly id?: any;
    readonly pattern?: string;
    readonly headers: HeaderMappings;
    readonly properties?: Record<string, any>;
    /**
     * client side timeout.
     */
    readonly timeout?: number;
    body?: T | null;
    query: Record<string, any> | undefined;
    get paths(): string | undefined;
    constructor(init: IncomingOpts<T>);
    /**
     * has header in packet or not.
     * @param packet
     * @param field
     */
    hasHeader(field: string): boolean;
    /**
     * get header from packet.
     * @param packet
     * @param field
     */
    getHeader(field: string): string | undefined;
}
/**
 * Incoming packet.
 */
export declare class DefaultUrlIncoming<T = any> extends AbstractIncoming<T> implements UrlIncoming<T> {
    url: string;
    method: string;
    get paths(): string;
    constructor(init: UrlIncomingOptions<T>);
    /**
     * has header in packet or not.
     * @param packet
     * @param field
     */
    hasHeader(field: string): boolean;
    /**
     * get header from packet.
     * @param packet
     * @param field
     */
    getHeader(field: string): string | undefined;
}
export declare function parseUrlIncoming(init: UrlIncomingOptions<IReadable>): UrlIncoming<any>;
export declare class UrlIncomingFactory implements IncomingFactory {
    private streamAdapter;
    constructor(streamAdapter: StreamAdapter);
    create(options: UrlIncomingOptions): ReadableLike<UrlIncoming>;
}
/**
 * Incoming packet.
 */
export declare class DefaultTopicIncoming<T = any> extends AbstractIncoming<T> implements TopicIncoming<T> {
    readonly topic: string;
    readonly responseTopic: string | undefined;
    get paths(): string;
    constructor(init: TopicIncomingOptions<T>);
    /**
     * has header in packet or not.
     * @param packet
     * @param field
     */
    hasHeader(field: string): boolean;
    /**
     * get header from packet.
     * @param packet
     * @param field
     */
    getHeader(field: string): string | undefined;
}
export declare function parseTopicIncoming(init: TopicIncomingOptions<IReadable>): TopicIncoming<any> & IReadable;
export declare class TopicIncomingFactory implements IncomingFactory {
    private streamAdapter;
    constructor(streamAdapter: StreamAdapter);
    create(options: TopicIncomingOptions): ReadableLike<TopicIncoming>;
}
/**
 * client incoming init options
 */
export interface UrlClientIncomingOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    url: string;
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
    body?: T;
    method?: string;
}
/**
 * client incoming init options
 */
export interface TopicClientIncomingOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    topic: string;
    params?: any;
    pattern?: string;
    headers?: HeadersLike;
    payload?: T;
    body?: T;
}
/**
 * client incoming init options
 */
export type ClientIncomingOpts<T = any, TStatus = any> = UrlClientIncomingOpts<T, TStatus> | TopicClientIncomingOpts<T, TStatus>;
/**
 * client incoming packet
 */
export declare abstract class AbstractClientIncoming<T, TStatus = any> implements ClientIncoming<T, TStatus> {
    readonly pattern?: string | undefined;
    readonly headers: HeaderMappings;
    streamLength?: number;
    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    type: number | undefined;
    error: any | null;
    ok: boolean;
    protected _status: TStatus | null;
    protected _message: string | undefined;
    get statusCode(): TStatus;
    get status(): TStatus;
    /**
     * body, payload alias name.
     */
    body?: T | null;
    /**
      * Textual description of response status code, defaults to OK.
      *
      * Do not depend on this.
      */
    get statusText(): string;
    get statusMessage(): string;
    constructor(init: ClientIncomingOpts, defaultStatus?: TStatus, defaultStatusText?: string);
    protected isOk(init: ClientIncomingOpts): boolean;
    /**
     * has header in packet or not.
     * @param packet
     * @param field
     */
    hasHeader(field: string): boolean;
    /**
     * get header from packet.
     * @param packet
     * @param field
     */
    getHeader(field: string): string | undefined;
}
export declare class UrlClientIncoming<T = any, TStatus = any> extends AbstractClientIncoming<T, TStatus> {
    readonly url: string;
    constructor(init: UrlClientIncomingOpts, defaultStatus?: TStatus, defaultStatusText?: string);
}
export declare class UrlClientIncomingFactory implements ClientIncomingFactory {
    private streamAdapter;
    constructor(streamAdapter: StreamAdapter);
    create<T = any>(options: UrlClientIncomingOpts<any, any>): ReadableLike<UrlClientIncoming<T>>;
}
export declare function parseUrlClientIncoming<TStatus>(init: UrlClientIncomingOpts<IReadable>, defaultStatus?: TStatus, defaultStatusText?: string): UrlClientIncoming<any, TStatus> & IReadable;
export declare class TopicClientIncoming<T, TStatus = any> extends AbstractClientIncoming<T, TStatus> {
    readonly topic: string;
    constructor(init: TopicClientIncomingOpts, defaultStatus?: TStatus, defaultStatusText?: string);
}
export declare function parseTopicClientIncoming<TStatus>(init: TopicClientIncomingOpts<IReadable>, defaultStatus?: TStatus, defaultStatusText?: string): TopicClientIncoming<any, TStatus> & IReadable;
export declare class TopicClientIncomingFactory implements ClientIncomingFactory {
    private streamAdapter;
    constructor(streamAdapter: StreamAdapter);
    create<T = any>(options: TopicClientIncomingOpts<any, any>): ReadableLike<TopicClientIncoming<T>>;
}
export declare function provideIncomings(): StaticProvider[];
