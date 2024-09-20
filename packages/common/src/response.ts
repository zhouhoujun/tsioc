import { Abstract, Injectable, hasOwn, isPlainObject } from '@tsdi/ioc';
import { HeaderMappings, HeadersLike } from './headers';
import { PacketOpts } from './packet';
import { Pattern } from './pattern';

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
export interface ResponseInitOpts<T = any, TStatus = any> extends PacketOpts<T>, StatusOptions<TStatus> {
    pattern?: Pattern;
}


export abstract class ResponseBase<T, TStatus = any> {
    readonly pattern: Pattern | undefined;
    /**
     * All response headers.
     */
    readonly headers: HeaderMappings;

    /**
     * Response status code.
     */
    readonly status: TStatus;

    private _message!: string;
    /**
     * Textual description of response status code, defaults to OK.
     *
     * Do not depend on this.
     */
    get statusText(): string {
        return this._message
    }

    get statusMessage(): string {
        return this._message
    }

    readonly error?: any;

    /**
     * Whether the status code falls in the 2xx range.
     */
    readonly ok: boolean;

    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    readonly type!: number;

    constructor(init: ResponseInitOpts, defaultStatus: TStatus = null!, defaultStatusText = 'OK') {
        this.headers = init.headers instanceof HeaderMappings ? init.headers : new HeaderMappings(init.headers);
        this.status = init.status !== undefined ? init.status : defaultStatus;
        this.ok = init.error ? false : (init.ok === true || this.isOk(this.status));
        this._message = init.statusText || init.statusMessage || defaultStatusText;
        this.pattern = init.pattern;
    }

    protected isOk(status: TStatus) {
        return true;
    }

}

/**
 * header response.
 */
export class HeaderResponse<TStatus = any> extends ResponseBase<null, TStatus> {
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
    }) {
        super(init);
    }

}

/**
 * response packet.
 */
export class Response<T, TStatus = any> extends ResponseBase<T, TStatus> {
    /**
     * The response body, or `null` if one was not returned.
     */
    readonly body: T | null;

    get payload(): T | null {
        return this.body;
    }

    constructor(init: {
        pattern?: Pattern;
        /**
         * event type
         */
        type?: number;
        headers?: HeadersLike;
        payload?: T;
        body?: T | null,
        status?: TStatus;
        statusMessage?: string;
        statusText?: string;
        ok?: boolean;
    }) {
        super(init);

        this.body = init.body !== undefined ? init.body : (init.payload ?? null)!
    }
}

/**
 * Error packet.
 */
export class ErrorResponse<TStatus = any> extends ResponseBase<null, TStatus> {

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
    }) {
        super(init, null!, init.error?.message ?? 'Unknown Error');
        this.error = init.error || null;
    }
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

export function isResponseEvent(target: any): target is ResponseEvent<any> {
    if (!target) return false;
    return target instanceof ResponseBase || (isPlainObject(target) && hasOwn(target, 'type'));
}

@Abstract()
export abstract class ResponseFactory<TStatus = null> {
    /**
     * create response.
     * @param options 
     */
    abstract create<T>(options: ResponseInitOpts): ResponseEvent<T, TStatus> | ErrorResponse<TStatus>;
}

@Injectable()
export class DefaultResponseFactory<TStatus = null> {

    create<T>(options: ResponseInitOpts): ResponseEvent<T, TStatus> {
        if (!options.ok || options.error) {
            if(!options.error){
                options.error = options.payload;
            }
            return new ErrorResponse(options);
        }
        return new Response(options);
    }
}