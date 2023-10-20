import { ResHeaders, ResHeadersLike } from './headers';


/**
 * Transport error response.
 * response for `TransportClient`.
 */
export class TransportErrorResponse<TStatus = any> {
    readonly error: any;
    readonly url: string;
    readonly status: TStatus;
    get statusText(): string {
        return this.statusMessage;
    }
    readonly statusMessage: string;
    readonly headers: ResHeaders;

    constructor(options: {
        url?: string,
        headers?: ResHeadersLike;
        status: TStatus;
        error?: any;
        statusText?: string;
        statusMessage?: string;
    }) {
        this.url = options.url ?? '';
        this.status = options.status;
        this.statusMessage = options.statusMessage ?? options.statusText ?? '';
        this.error = options.error;
        this.headers = new ResHeaders(options.headers);
    }
}

/**
 * client receive Response.
 * response for `TransportClient`.
 */
export class TransportHeaderResponse<TStatus = any> {
    readonly url: string;
    readonly ok: boolean;
    readonly status: TStatus;
    get statusText(): string {
        return this.statusMessage;
    }

    readonly statusMessage: string;
    readonly headers: ResHeaders;

    constructor(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeadersLike;
        status: TStatus;
        statusText?: string;
        statusMessage?: string;
    }) {
        this.url = options.url ?? '';
        this.status = options.status ?? 200 as TStatus;
        this.ok = options.ok ?? true;
        this.statusMessage = options.statusMessage ?? options.statusText ?? '';
        this.headers = new ResHeaders(options.headers);
    }

}


/**
 * client receive Response.
 * response for `TransportClient`.
 */
export class TransportResponse<T = any, TStatus = any> extends TransportHeaderResponse<TStatus> {
    readonly body: T | null;

    constructor(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeadersLike;
        status: TStatus
        statusText?: string;
        statusMessage?: string;
        body?: T;
        payload?: T;
    }) {
        super(options);
        this.body = options.body ?? options.payload ?? null;
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
 * response for `TransportClient`.
 */
export type TransportEvent<T = any, TStatus = any> = TransportErrorResponse<TStatus> | TransportHeaderResponse<TStatus> | TransportResponse<T, TStatus> | ResponseEvent;

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
