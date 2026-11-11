import { GatewayLoadBalanceOptions } from './gateway.options';

/**
 * Resolve the delay before the next failover attempt.
 *
 * `retryBackoffMs` is the base delay for the first retry; subsequent retries
 * use exponential backoff capped by `retryBackoffMaxMs`. Jitter is applied by
 * default when a positive backoff is configured.
 */
export function resolveRetryBackoff(
    options: GatewayLoadBalanceOptions | undefined,
    attempt: number
): number {
    const base = options?.retryBackoffMs ?? 0;
    if (base <= 0) {
        return 0;
    }
    const max = Math.max(options?.retryBackoffMaxMs ?? 5_000, base);
    const exponent = Math.max(attempt, 0);
    const delay = Math.min(base * Math.pow(2, exponent), max);
    const jitter = options?.retryJitter !== false;
    return jitter ? Math.round(delay * (0.5 + Math.random() * 0.5)) : delay;
}
