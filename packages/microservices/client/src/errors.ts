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
