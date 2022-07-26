import { OutgoingHeader, ResHeaders, ResHeadersLike, ResponsePacket } from '@tsdi/core';

/**
 * client error response.
 */
export class ErrorResponse {
    readonly id: string;
    readonly error: any;
    readonly url: string;
    readonly status: number;
    get statusText(): string {
        return this.statusMessage;
    }
    readonly statusMessage: string;
    readonly headers: Record<string, OutgoingHeader>;

    constructor(options: {
        id: string;
        url?: string,
        headers?: Record<string, OutgoingHeader>;
        status: number;
        error?: any;
        statusText?: string;
        statusMessage?: string;
    }) {
        this.id = options.id;
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
export class TransportResponse<T = any> implements ResponsePacket<T> {
    readonly id: string;
    readonly body: T | null;
    readonly url: string;
    readonly ok: boolean;
    readonly status: number;
    get statusText(): string {
        return this.statusMessage;
    }

    readonly statusMessage: string;
    readonly headers: ResHeaders;

    constructor(options: {
        id: string;
        url?: string,
        ok?: boolean;
        headers?: ResHeadersLike;
        status: number;
        statusText?: string;
        statusMessage?: string;
        body?: T;
    }) {
        this.id = options.id ?? '';
        this.url = options.url ?? '';
        this.status = options.status;
        this.ok = options.ok ?? false;
        this.statusMessage = options.statusMessage ?? options.statusText ?? '';
        this.body = options.body ?? null;
        this.headers = new ResHeaders(options.headers ?? {});
    }

}

/**
 * transport event.
 */
export type TransportEvent<T = any> = ErrorResponse | TransportResponse<T>;
