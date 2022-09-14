import { OutgoingHeader, ResHeaders, ResHeadersLike } from './headers';
import { Message } from './packet';

/**
 * Transport error response.
 * response for `TransportClient`.
 */
export class TransportErrorResponse {
    readonly error: any;
    readonly url: string;
    readonly status: number;
    get statusText(): string {
        return this.statusMessage;
    }
    readonly statusMessage: string;
    readonly headers: Record<string, OutgoingHeader>;

    constructor(options: {
        url?: string,
        headers?: Record<string, OutgoingHeader>;
        status: number;
        error?: any;
        statusText?: string;
        statusMessage?: string;
    }) {
        this.url = options.url ?? '';
        this.status = options.status;
        this.statusMessage = options.statusMessage ?? options.statusText ?? '';
        this.error = options.error;
        this.headers = options.headers ?? {};
    }
}

/**
 * client receive Response.
 * response for `TransportClient`.
 */
export class TransportHeaderResponse implements Message<ResHeaders> {
    readonly url: string;
    readonly ok: boolean;
    readonly status: number;
    get statusText(): string {
        return this.statusMessage;
    }

    readonly statusMessage: string;
    readonly headers: ResHeaders;

    constructor(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeadersLike;
        status: number;
        statusText?: string;
        statusMessage?: string;
    }) {
        this.url = options.url ?? '';
        this.status = options.status;
        this.ok = options.ok ?? false;
        this.statusMessage = options.statusMessage ?? options.statusText ?? '';
        this.headers = new ResHeaders(options.headers ?? {});
    }

}


/**
 * client receive Response.
 * response for `TransportClient`.
 */
export class TransportResponse<T = any> extends TransportHeaderResponse {
    readonly body: T | null;

    constructor(options: {
        url?: string,
        ok?: boolean;
        headers?: ResHeadersLike;
        status: number;
        statusText?: string;
        statusMessage?: string;
        body?: T;
    }) {
        super(options);
        this.body = options.body ?? null;
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
export type TransportEvent<T = any> = TransportErrorResponse | TransportHeaderResponse | TransportResponse<T> | ResponseEvent;

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
