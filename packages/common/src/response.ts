import { isNil } from '@tsdi/ioc';
import { HeadersLike, TransportHeaders } from './headers';
import { StatusCode } from './status';


/**
 * Transport error response.
 * response for `TransportClient`.
 */
export class TransportErrorResponse {
    readonly error: any;
    readonly url: string;
    readonly status: StatusCode;
    get statusText(): string {
        return this.statusMessage;
    }
    readonly statusMessage: string;
    readonly headers: TransportHeaders;

    constructor(options: {
        url?: string,
        headers?: HeadersLike;
        status?: StatusCode;
        error?: any;
        statusText?: string;
        statusMessage?: string;
    }) {
        this.url = options.url ?? '';
        this.status = options.status;
        this.statusMessage = options.statusMessage ?? options.statusText ?? '';
        this.error = options.error;
        this.headers = new TransportHeaders(options.headers);
    }
}

/**
 * client receive Response.
 * response for `TransportClient`.
 */
export class TransportHeaderResponse {
    readonly url: string;
    readonly ok: boolean;
    readonly status: StatusCode;
    get statusText(): string {
        return this.statusMessage;
    }

    readonly statusMessage: string;
    readonly headers: TransportHeaders;

    constructor(options: {
        url?: string,
        ok?: boolean;
        headers?: HeadersLike;
        status?: StatusCode;
        statusText?: string;
        statusMessage?: string;
    }) {
        this.url = options.url ?? '';
        this.ok = options.ok ?? true;
        this.headers = new TransportHeaders(options.headers);
        this.status = options.status;
        this.statusMessage = options.statusMessage ?? options.statusText ?? '';
    }

}

/**
 * client receive Response.
 * response for `TransportClient`.
 */
export class TransportResponse<T = any> {
    readonly url: string;
    readonly ok: boolean;
    readonly status: StatusCode;

    get statusText(): string {
        return this.statusMessage;
    }

    get body(): T | null {
        return this.payload
    }

    readonly statusMessage: string;
    readonly headers: TransportHeaders;

    readonly payload: T | null;

    constructor(options: {
        url?: string,
        ok?: boolean;
        headers?: HeadersLike;
        status?: StatusCode
        statusText?: string;
        statusMessage?: string;
        body?: T;
        payload?: T;
    }) {
        this.url = options.url ?? '';
        const noRes = isNil(options.payload || options.body || options.headers);
        this.headers = new TransportHeaders(options.headers);
        this.status = options.status;
        this.ok = options.ok ?? !noRes;
        this.payload = options.body ?? options.payload ?? null;
        this.statusMessage = options.statusMessage ?? options.statusText ?? '';
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
export type TransportEvent<T = any> = TransportHeaderResponse | TransportResponse<T> | ResponseEvent;

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
