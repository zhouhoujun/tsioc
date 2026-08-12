export type ModelErrorKind = 'rate-limit' | 'server' | 'network' | 'timeout' | 'unknown';

export function classifyModelError(status?: number, error?: unknown): ModelErrorKind {
    if (status === 429) return 'rate-limit';
    if (typeof status === 'number' && status >= 500) return 'server';
    const message = String((error as any)?.message ?? error ?? '').toLowerCase();
    if (message.includes('timeout') || message.includes('aborted')) return 'timeout';
    if (error || message.includes('network') || message.includes('fetch failed')) return 'network';
    return 'unknown';
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
