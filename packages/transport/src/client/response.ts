import { OutgoingHeader, ResHeaders, ResHeadersLike, ResponsePacket } from '@tsdi/core';

/**
 * client error response.
 */
export class ErrorResponse {
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
 */
export class TransportHeaderResponse {
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
 */
export class TransportResponse<T = any> extends TransportHeaderResponse implements ResponsePacket<T> {
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
 * transport event.
 */
export type TransportEvent<T = any> = ErrorResponse | TransportHeaderResponse | TransportResponse<T>;

