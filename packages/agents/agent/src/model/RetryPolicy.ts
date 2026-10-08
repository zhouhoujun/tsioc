export type ModelErrorKind = 'rate-limit' | 'quota' | 'auth' | 'config' | 'capacity' | 'server' | 'network' | 'timeout' | 'unknown';

/**
 * Body signals that mean "the account cannot pay / the key is rejected".
 * These are terminal: retrying the identical request can never succeed, so they
 * must not be folded into the retryable `capacity`/`rate-limit` buckets (that
 * would burn the whole retry budget on a billing wall and still fail).
 */
const QUOTA_BODY_SIGNALS = ['insufficient_quota', 'insufficient quota', 'insufficient balance', 'payment required', 'billing'];
const AUTH_BODY_SIGNALS = ['invalid api key', 'invalid_api_key', 'incorrect api key', 'authentication', 'unauthorized', 'permission_denied', 'forbidden'];
const RATE_LIMIT_MESSAGE_SIGNALS = ['rate increased too quickly', 'too many requests', 'too_many_requests', 'rate limit', 'rate-limit', 'rate_limit', 'resource exhausted', 'resource_exhausted'];
const TRANSIENT_MESSAGE_SIGNALS = ['service unavailable', 'service_unavailable', 'service-unavailable', 'internal error', 'internal_error', 'internal server error', 'provider returned error', 'provider_returned_error', 'try again later', 'try your request again'];

export function classifyModelError(status?: number, error?: unknown): ModelErrorKind {
    if (status === 429) return 'rate-limit';
    // 402 = billing exhausted; 401/403 = credential rejected. Both are terminal.
    if (status === 402) return 'quota';
    if (status === 401 || status === 403) return 'auth';
    // 529 = Anthropic/OpenAI overloaded; also detect capacity-related body errors.
    if (status === 529) return 'capacity';
    if (typeof status === 'number' && status >= 500) return 'server';
    const message = String((error as any)?.message ?? error ?? '').toLowerCase();
    if (message.includes('overloaded') || message.includes('capacity')) {
        return 'capacity';
    }
    if (QUOTA_BODY_SIGNALS.some((signal) => message.includes(signal))) {
        return 'quota';
    }
    if (AUTH_BODY_SIGNALS.some((signal) => message.includes(signal))) {
        return 'auth';
    }
    // Provider-neutral transient signals (often surfaced without a status code
    // by proxies/gateways): treat as retryable so a flaky endpoint does not fail
    // the turn outright.
    if (RATE_LIMIT_MESSAGE_SIGNALS.some((signal) => message.includes(signal))) {
        return 'rate-limit';
    }
    if (TRANSIENT_MESSAGE_SIGNALS.some((signal) => message.includes(signal))) {
        return 'server';
    }
    // A received non-retryable HTTP response is not a transport failure merely
    // because its response body contains an error message.
    if (typeof status === 'number') return 'unknown';
    if (message.includes('timeout') || message.includes('aborted')) return 'timeout';
    // Match both snake_case and kebab-case forms that providers emit.
    if (message.includes('network_error') || message.includes('network-error')
        || message.includes('econnrefused') || message.includes('econnreset')
        || message.includes('enotfound') || message.includes('socket hang up')
        || message.includes('fetch failed') || message.includes('network')) {
        return 'network';
    }
    if (error) return 'network';
    return 'unknown';
}

/**
 * Returns `true` when the classified error kind is safe to retry with backoff.
 * Capacity and rate-limit errors are always retryable; server/network/timeout
 * are retryable; unknown is not.
 */
export function isRetryableError(kind: ModelErrorKind): boolean {
    return kind === 'rate-limit' || kind === 'capacity'
        || kind === 'server' || kind === 'network' || kind === 'timeout';
}

export function retryAfterMs(value: string | null | undefined, now: number = Date.now()): number | undefined {
    if (!value) return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(value);
    return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

/** A6: model retry backoff policy surface (optional fields default to DEFAULT_RETRY_POLICY). */
export interface AgentRetryPolicy {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterMs?: number;
}

/** A6: schema-default model retry backoff (previously module-level constants in the adapters). */
export const DEFAULT_RETRY_POLICY: Required<AgentRetryPolicy> = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
    jitterMs: 500
};

export function retryDelayMs(attempt: number, retryAfter?: string | null, policy: AgentRetryPolicy = DEFAULT_RETRY_POLICY): number {
    const hinted = retryAfterMs(retryAfter);
    const maxDelayMs = policy.maxDelayMs ?? DEFAULT_RETRY_POLICY.maxDelayMs;
    if (hinted !== undefined) return Math.min(hinted, maxDelayMs);
    const baseDelayMs = policy.baseDelayMs ?? DEFAULT_RETRY_POLICY.baseDelayMs;
    const jitterMs = policy.jitterMs ?? DEFAULT_RETRY_POLICY.jitterMs;
    return Math.min(baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)) + Math.random() * jitterMs, maxDelayMs);
}
