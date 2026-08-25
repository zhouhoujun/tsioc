export type ModelErrorKind = 'rate-limit' | 'capacity' | 'server' | 'network' | 'timeout' | 'unknown';

export function classifyModelError(status?: number, error?: unknown): ModelErrorKind {
    if (status === 429) return 'rate-limit';
    // 529 = Anthropic/OpenAI overloaded; also detect capacity-related body errors.
    if (status === 529) return 'capacity';
    if (typeof status === 'number' && status >= 500) return 'server';
    const message = String((error as any)?.message ?? error ?? '').toLowerCase();
    if (message.includes('timeout') || message.includes('aborted')) return 'timeout';
    if (message.includes('overloaded') || message.includes('capacity')
        || message.includes('insufficient_quota') || message.includes('insufficient quota')) {
        return 'capacity';
    }
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

export function retryAfterMs(value: string | null | undefined): number | undefined {
    if (!value) return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(value);
    return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

export function retryDelayMs(attempt: number, retryAfter?: string | null): number {
    const hinted = retryAfterMs(retryAfter);
    if (hinted !== undefined) return Math.min(hinted, 15000);
    return Math.min(1000 * Math.pow(2, Math.max(0, attempt - 1)) + Math.random() * 500, 15000);
}
