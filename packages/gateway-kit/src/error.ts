import type { ServerResponse } from 'http';

/** Stable gateway error categories shared by logs, metrics and headers. */
export type GatewayErrorType =
    | 'rate_limited'
    | 'bulkhead_full'
    | 'circuit_open'
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'validation'
    | 'timeout'
    | 'network'
    | 'upstream'
    | 'client'
    | 'internal';

export interface GatewayErrorEnvelope {
    code: string;
    message: string;
    type?: GatewayErrorType;
}

export interface GatewayErrorOptions {
    /** Legacy `{ error: "message" }` body (agent gateway default). */
    legacy?: boolean;
    /** Stable machine-readable code for the envelope form. */
    code?: string;
    /** Extra top-level fields kept for wire compatibility (`path`, `statusCode`, ...). */
    extra?: Record<string, any>;
    headers?: Record<string, string>;
    /** Emit the `x-gateway-error-type` header (microservice gateway). */
    errorTypeHeader?: boolean;
}

export function gatewayErrorTypeForStatus(status: number): GatewayErrorType {
    if (status === 429) return 'rate_limited';
    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'not_found';
    if (status === 400 || status === 422) return 'validation';
    if (status === 504) return 'timeout';
    if (status >= 500) return 'internal';
    return status >= 400 ? 'client' : 'internal';
}

/** Body for an error response: legacy `{ error }` or the envelope `{ error: {...} }`. */
export function gatewayErrorBody(status: number, message: string, options: GatewayErrorOptions = {}): Record<string, any> {
    const type = gatewayErrorTypeForStatus(status);
    if (options.legacy !== false) {
        return { error: message, ...(options.extra || {}) };
    }
    return {
        error: {
            code: options.code || type,
            message,
            type
        } as GatewayErrorEnvelope,
        ...(options.extra || {})
    };
}

/** Write a JSON error response using the agent (legacy) or envelope shape. */
export function sendGatewayError(
    res: Pick<ServerResponse, 'writeHead' | 'end'>,
    status: number,
    message: string,
    options: GatewayErrorOptions = {}
): void {
    const headers: Record<string, any> = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (options.errorTypeHeader) {
        headers['x-gateway-error-type'] = gatewayErrorTypeForStatus(status);
    }
    res.writeHead(status, headers);
    res.end(JSON.stringify(gatewayErrorBody(status, message, options)));
}
