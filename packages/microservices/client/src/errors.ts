/**
 * Stable client error codes shared by every transport backend.
 */
export type ServiceErrorCode =
    | 'transport'
    | 'timeout'
    | 'circuit'
    | 'rateLimit'
    | 'upstream'
    | 'contract'
    | 'discovery'
    | 'unknown';

export interface ServiceErrorOptions {
    status?: number;
    statusMessage?: string;
    body?: unknown;
    headers?: Record<string, any>;
    url?: string;
    response?: unknown;
    cause?: unknown;
}

/**
 * Normalized error thrown by service clients.
 *
 * Every transport should surface failures through this type so callers can
 * branch on `code`/`status` instead of the concrete protocol.
 */
export class ServiceError extends Error {
    readonly status?: number;
    readonly statusCode?: number;
    readonly statusMessage?: string;
    readonly body?: unknown;
    readonly headers?: Record<string, any>;
    readonly url?: string;
    readonly response?: unknown;
    readonly cause?: unknown;

    constructor(message: string, readonly code: ServiceErrorCode = 'unknown', options: ServiceErrorOptions = {}) {
        super(message);
        this.name = 'ServiceError';
        this.status = options.status;
        this.statusCode = options.status;
        this.statusMessage = options.statusMessage;
        this.body = options.body;
        this.headers = options.headers;
        this.url = options.url;
        this.response = options.response;
        this.cause = options.cause;
        Object.setPrototypeOf(this, ServiceError.prototype);
    }

    get ok(): boolean {
        return false;
    }
}

/**
 * Coerce any backend failure into an `Error`.
 *
 * Broker transports throw `ErrorResponse` (a `ResponseBase`, not an `Error`),
 * which breaks `instanceof Error`, stack traces and log/alert collectors.
 * HTTP already throws `ServiceError`; this keeps every client surface
 * consistent without changing concrete `Error` subclasses that callers may
 * already branch on.
 */
export function toServiceError(err: unknown): Error {
    if (err instanceof Error) {
        return err;
    }
    const candidate = err as {
        status?: number | string | null;
        statusCode?: number | string | null;
        statusMessage?: string;
        statusText?: string;
        message?: string;
        headers?: Record<string, any>;
        error?: any;
        body?: any;
        payload?: any;
    } | null | undefined;
    const rawStatus = candidate?.status ?? candidate?.statusCode;
    const status = typeof rawStatus === 'number' ? rawStatus : undefined;
    const body = candidate?.error ?? candidate?.body ?? candidate?.payload;
    const rawHeaders = candidate?.headers as any;
    const headers = rawHeaders
        ? (typeof rawHeaders.getHeaders === 'function' ? rawHeaders.getHeaders() : rawHeaders)
        : undefined;
    const message = (typeof body === 'string' ? body : body?.message)
        ?? candidate?.statusMessage
        ?? candidate?.statusText
        ?? candidate?.message
        ?? (typeof err === 'string' ? err : 'Unknown service error');
    return new ServiceError(message, status != null ? 'upstream' : 'unknown', {
        status,
        statusMessage: candidate?.statusMessage ?? candidate?.statusText,
        body,
        headers,
        response: err,
        cause: body instanceof Error ? body : err
    });
}
