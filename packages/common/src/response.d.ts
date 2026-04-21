import { HeaderMappings, HeadersLike } from './headers';
import { Pattern } from './pattern';
import { ClientIncoming } from './incoming';
export interface StatusOptions<TStatus = any> {
    /**
     * event type
     */
    type?: number;
    status?: TStatus;
    statusMessage?: string;
    statusCode?: TStatus;
    statusText?: string;
    ok?: boolean;
    error?: any;
}
/**
 * response packet data.
 */
export interface ResponseInitOpts<T = any, TStatus = any> extends StatusOptions<TStatus> {
    /**
     * response pattern.
     */
    pattern?: Pattern;
    /**
     * headers of packet.
     */
    headers?: HeadersLike;
    /**
     * payload of packet.
     */
    body?: T | null;
    /**
     * payload of packet.
     */
    payload?: T | null;
}
export declare abstract class ResponseBase<T, TStatus = any> {
    readonly pattern: Pattern | undefined;
    /**
     * All response headers.
     */
    readonly headers: HeaderMappings;
    /**
     * Response status code.
     */
    readonly status: TStatus;
    private _message;
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusText(): string;
    get statusMessage(): string;
    readonly error?: any;
    /**
     * Whether the status code falls in the 2xx range.
     */
    readonly ok: boolean;
    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    readonly type: number;
    constructor(init: ResponseInitOpts, defaultStatus?: TStatus, defaultStatusText?: string);
    protected isOk(status: TStatus): boolean;
}
/**
 * header response.
 */
export declare class HeaderResponse<TStatus = any> extends ResponseBase<null, TStatus> {
    constructor(init: {
        url?: string;
        pattern?: Pattern;
        /**
         * event type
         */
        type?: number;
        ok?: boolean;
        headers?: HeadersLike;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
    });
}
/**
 * response packet.
 */
export declare class Response<T, TStatus = any> extends ResponseBase<T, TStatus> {
    /**
     * The response body, or `null` if one was not returned.
     */
    readonly body: T | null;
    get payload(): T | null;
    constructor(init: {
        pattern?: Pattern;
        /**
         * event type
         */
        type?: number;
        headers?: HeadersLike;
        payload?: T;
        body?: T | null;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        ok?: boolean;
    });
}
/**
 * Error packet.
 */
export declare class ErrorResponse<TStatus = any> extends ResponseBase<null, TStatus> {
    readonly error: any | null;
    constructor(init: {
        pattern?: Pattern;
        /**
         * event type
         */
        type?: number;
        headers?: HeadersLike;
        error?: any;
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
    });
    protected isOk(status: TStatus): boolean;
}
/**
 * event response.
 */
export interface ResponseEventPacket {
    type: number;
}
/**
 * An error that represents a failed attempt to JSON.parse text coming back
 * from the server.
 *
 * It bundles the Error object with the actual response body that failed to parse.
 *
 */
export interface ResponseJsonParseError {
    error: Error;
    text: string;
}
/**
 * Response Event
 */
export type ResponseEvent<T, TStatus = any> = HeaderResponse<TStatus> | Response<T, TStatus> | ResponseEventPacket;
export declare abstract class ResponseFactory<TStatus = null> {
    /**
     * create response.
     * @param options
     */
    abstract create<T>(options: ClientIncoming<T>): ResponseEvent<T, TStatus> | ErrorResponse<TStatus>;
}
export declare class DefaultResponseFactory<TStatus = null> {
    create<T>(options: ResponseInitOpts): ResponseEvent<T, TStatus>;
}
