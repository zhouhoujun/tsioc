import { ResHeaderType, ResponsePacket } from '@tsdi/core';

/**
 * tcp error response.
 */
export class TcpErrorResponse {
    readonly id: string;
    readonly error: any;
    readonly url: string;
    readonly status: number;
    get statusText(): string {
        return this.statusMessage;
    }
    readonly statusMessage: string;
    readonly headers: Record<string, ResHeaderType>;

    constructor(options: {
        id: string;
        url?: string,
        headers?: Record<string, ResHeaderType>;
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
 * TcpResponse.
 */
export class TcpResponse<T = any> implements ResponsePacket<T> {
    readonly id: string;
    readonly body: T | null;
    readonly url: string;
    readonly ok: boolean;
    readonly status: number;
    get statusText(): string {
        return this.statusMessage;
    }

    readonly statusMessage: string;
    readonly headers: Record<string, ResHeaderType>;

    constructor(options: {
        id: string;
        url?: string,
        ok?: boolean;
        headers?: Record<string, ResHeaderType>;
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
        this.headers = options.headers ?? {};
    }

}

export type TcpEvent<T = any> = TcpErrorResponse | TcpResponse<T>;

