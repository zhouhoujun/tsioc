export interface GatewayForwardMeta {
    endpoint?: string;
    cacheStatus?: 'HIT' | 'MISS' | 'SKIP';
    outcome?: 'upstream' | 'aggregate' | 'cache' | 'mock' | 'fallback' | 'rejected' | 'error';
    canary?: boolean;
    errorType?: GatewayErrorType;
    streaming?: boolean;
}

export interface GatewayForwardResult {
    status: number;
    statusText: string;
    payload: any;
    headers?: Record<string, string>;
    meta?: GatewayForwardMeta;
}

/**
 * Stable gateway error categories used by access logs, metrics and the
 * `x-gateway-error-type` response header.
 */
export type GatewayErrorType =
    | 'rate_limited'
    | 'bulkhead_full'
    | 'circuit_open'
    | 'unauthorized'
    | 'forbidden'
    | 'validation'
    | 'timeout'
    | 'network'
    | 'upstream'
    | 'client'
    | 'internal';

export function classifyGatewayError(error: any): GatewayErrorType {
    const status = error?.statusCode ?? error?.status;
    const message = String(error?.message ?? '');
    if (status === 429) {
        return 'rate_limited';
    }
    if (status === 503 && /bulkhead/i.test(message)) {
        return 'bulkhead_full';
    }
    if (/circuit breaker/i.test(message)) {
        return 'circuit_open';
    }
    if (status === 401) {
        return 'unauthorized';
    }
    if (status === 403) {
        return 'forbidden';
    }
    if (status === 400 || status === 422) {
        return 'validation';
    }
    if (status === 504 || error?.name === 'AbortError' || /timeout/i.test(message)) {
        return 'timeout';
    }
    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(error?.code)) {
        return 'network';
    }
    if (status >= 500) {
        return 'upstream';
    }
    if (status >= 400) {
        return 'client';
    }
    return 'internal';
}
