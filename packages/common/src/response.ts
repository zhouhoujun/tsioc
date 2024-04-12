import { isNil } from '@tsdi/ioc';
import { HeadersLike, TransportHeaders } from './headers';



/**
 * Base class for both `HttpResponse` and `HttpHeaderResponse`.
 *
 * @publicApi
 */
export abstract class TransportResponseBase<TStatus = number> {

    /**
     * All response headers.
     */
    readonly headers: TransportHeaders;

    /**
     * Response status code.
     */
    readonly status: TStatus | null;

    protected _message!: string;
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

    /**
     * URL of the resource retrieved, or null if not available.
     */
    url: string;

    readonly error?: any;

    /**
     * Whether the status code falls in the 2xx range.
     */
    get ok(): boolean {
        return this.isOk()
    }

    /**
     * Type of the response, narrowed to either the full response or the header.
     */
    readonly type!: number;

    /**
     * Super-constructor for all responses.
     *
     * The single parameter accepted is an initialization hash. Any properties
     * of the response passed there will override the default values.
     */
    constructor(
        init: {
            type?: number,
            headers?: HeadersLike,
            status?: TStatus | null,
            statusText?: string,
            url?: string,
        },
        defaultStatus?: TStatus | null, defaultStatusText = 'OK') {
        // If the hash has values passed, use them to initialize the response.
        // Otherwise use the default values.
        if (!isNil(init.type)) this.type = init.type;
        this.headers = init.headers instanceof TransportHeaders ? init.headers : new TransportHeaders(init.headers);
        this.status = init.status !== undefined ? init.status : defaultStatus ?? null!;
        this._message = init.statusText || defaultStatusText;
        this.url = init.url || null!
    }

    protected isOk() {
        return true;
    }

}

/**
 * Transport error response.
 * response for `TransportClient`.
 */
export class TransportErrorResponse<TStatus = number> extends TransportResponseBase<TStatus> {

    readonly message: string;
    readonly error: any | null;
    body = null;

    constructor(init: {
        type?: number,
        error?: any;
        headers?: HeadersLike;
        status?: TStatus | null;
        statusText?: string;
        url?: string;
    },
        defaultStatus?: TStatus | null, defaultStatusText = 'Unknown Error') {
        super(init, defaultStatus, defaultStatusText)

        this.error = init.error || null;
        this.message = this.formatMessage();
    }

    protected override isOk(): boolean {
        return false;
    }

    protected formatMessage() {
        return this.error?.message;
    }

}

/**
 * client receive Response.
 * response for `TransportClient`.
 */
export class TransportHeaderResponse<TStatus = any> extends TransportResponseBase<TStatus> {

    constructor(init: {
        type?: number,
        url?: string,
        ok?: boolean;
        headers?: HeadersLike;
        status?: TStatus;
        statusText?: string;
        statusMessage?: string;
    },
        defaultStatus?: TStatus | null, defaultStatusText = 'OK') {
        super(init, defaultStatus, defaultStatusText)
    }
}

/**
 * client receive Response.
 * response for `TransportClient`.
 */
export class TransportResponse<T = any, TStatus = number> extends TransportResponseBase<TStatus> {
    /**
     * The response body, or `null` if one was not returned.
     */
    body: T | null;

    get payload(): T | null {
        return this.body;
    }


    constructor(init: {
        url?: string,
        ok?: boolean;
        headers?: HeadersLike;
        status?: TStatus | null
        statusText?: string;
        statusMessage?: string;
        body?: T;
        payload?: T;
    },
        defaultStatus?: TStatus | null, defaultStatusText = 'OK') {
        super(init, defaultStatus, defaultStatusText);
        this.body = init.body !== undefined ? init.body : null!
    }
}

/**
 * event response.
 */
export interface ResponseEvent {
    type: number;
}

/**
 * transport event.
 * response for `Client`.
 */
export type TransportEvent<T = any, TStatus = any> = TransportHeaderResponse<TStatus> | TransportResponse<T, TStatus> | ResponseEvent;

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
