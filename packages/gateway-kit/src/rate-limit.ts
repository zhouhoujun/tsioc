/**
 * Fixed-window rate limiting with optional quota/throttle dimensions and a
 * shared store for multi-replica gateways.
 *
 * Both gateways share this implementation: the agent gateway uses the simple
 * window, the microservice gateway the extra dimensions (quota/throttle).
 */

export interface GatewayRateLimitQuota {
    limit: number;
    windowMs: number;
    message?: string;
}

export interface GatewayRateLimitThrottle {
    minIntervalMs: number;
    message?: string;
}

export interface GatewayRateLimitPolicy {
    /** Short-window request limit (optional when only quota/throttle is used). */
    limit?: number;
    /** Window length in milliseconds; defaults to 60s. */
    windowMs?: number;
    /** Long-window request quota (e.g. daily/monthly caps). */
    quota?: GatewayRateLimitQuota;
    /** Minimum interval between accepted requests. */
    throttle?: GatewayRateLimitThrottle;
    /** Default rejection message. */
    message?: string;
    /** Bound on tracked keys (oldest evicted first). */
    maxKeys?: number;
}

export type GatewayRateLimitReason = 'limit' | 'quota' | 'throttle';

export interface GatewayRateLimitDecision {
    allowed: boolean;
    count: number;
    resetAt: number;
    retryAfterMs: number;
    reason?: GatewayRateLimitReason;
    message?: string;
}

export interface GatewayRateLimitRejection {
    message: string;
    retryAfterMs: number;
}

export interface GatewayRateLimitStore {
    increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

interface WindowEntry {
    count: number;
    windowStart: number;
    quotaCount: number;
    quotaStart: number;
    lastAt?: number;
}

const DEFAULT_WINDOW_MS = 60_000;

export class GatewayRateLimiter {
    private readonly windows = new Map<string, WindowEntry>();
    private readonly maxKeys: number;
    private cleanupTimer?: ReturnType<typeof setInterval>;

    constructor(
        readonly policy: GatewayRateLimitPolicy,
        private readonly options: { store?: GatewayRateLimitStore } = {}
    ) {
        this.maxKeys = Math.max(1, policy.maxKeys ?? 10000);
        const windowMs = this.longestWindowMs();
        this.cleanupTimer = setInterval(() => this.evict(), windowMs);
        (this.cleanupTimer as any)?.unref?.();
    }

    /** Memory-only check (sync); used by the agent gateway and quick paths. */
    check(key: string): GatewayRateLimitDecision {
        const now = Date.now();
        const entry = this.ensureEntry(key, now);
        const windowMs = this.policy.windowMs ?? DEFAULT_WINDOW_MS;
        const limit = this.policy.limit;
        const quota = this.policy.quota;
        const throttle = this.policy.throttle;

        if (limit != null) {
            if (now - entry.windowStart >= windowMs) {
                entry.windowStart = now;
                entry.count = 0;
            }
            if (entry.count >= limit) {
                return this.rejectionDecision(key, 'limit', Math.max(0, entry.windowStart + windowMs - now), now);
            }
        }
        if (quota) {
            if (!entry.quotaStart || now - entry.quotaStart >= quota.windowMs) {
                entry.quotaStart = now;
                entry.quotaCount = 0;
            }
            if (entry.quotaCount >= quota.limit) {
                return this.rejectionDecision(key, 'quota', Math.max(0, entry.quotaStart + quota.windowMs - now), now);
            }
        }
        if (throttle && entry.lastAt && now - entry.lastAt < throttle.minIntervalMs) {
            return this.rejectionDecision(key, 'throttle', throttle.minIntervalMs - (now - entry.lastAt), now);
        }

        if (limit != null) {
            entry.count += 1;
        }
        if (quota) {
            entry.quotaCount += 1;
        }
        if (throttle) {
            entry.lastAt = now;
        }
        const resetAt = entry.windowStart + windowMs;
        return { allowed: true, count: entry.count, resetAt, retryAfterMs: 0 };
    }

    /** Shared-store check when configured, memory fallback otherwise. */
    async checkShared(key: string): Promise<GatewayRateLimitDecision> {
        if (!this.options.store) {
            return this.check(key);
        }
        // Quota/throttle dimensions are local; only the short window is shared.
        if (this.policy.quota || this.policy.throttle || this.policy.limit == null) {
            return this.check(key);
        }
        const windowMs = this.policy.windowMs ?? DEFAULT_WINDOW_MS;
        const limit = this.policy.limit;
        const decision = await this.options.store.increment(key, windowMs);
        const allowed = decision.count <= limit;
        return {
            allowed,
            count: decision.count,
            resetAt: decision.resetAt,
            retryAfterMs: allowed ? 0 : Math.max(0, decision.resetAt - Date.now()),
            ...(allowed ? {} : { reason: 'limit' as const, message: this.rejectionMessage('limit') })
        };
    }

    /** Describe why the current window would reject the key. */
    rejection(key: string): GatewayRateLimitRejection {
        const now = Date.now();
        const entry = this.windows.get(key);
        const windowMs = this.policy.windowMs ?? DEFAULT_WINDOW_MS;
        const limit = this.policy.limit;
        const quota = this.policy.quota;
        const throttle = this.policy.throttle;
        if (throttle && entry?.lastAt) {
            const wait = throttle.minIntervalMs - (now - entry.lastAt);
            if (wait > 0) {
                return { message: this.rejectionMessage('throttle'), retryAfterMs: wait };
            }
        }
        if (quota && entry && entry.quotaCount >= quota.limit) {
            return {
                message: this.rejectionMessage('quota'),
                retryAfterMs: Math.max(0, entry.quotaStart + quota.windowMs - now)
            };
        }
        if (limit != null && entry) {
            return {
                message: this.rejectionMessage('limit'),
                retryAfterMs: Math.max(0, entry.windowStart + windowMs - now)
            };
        }
        return { message: this.rejectionMessage('limit'), retryAfterMs: windowMs };
    }

    /** Seconds for a `Retry-After` header (minimum 1). */
    retryAfterSeconds(decision: GatewayRateLimitDecision): number {
        return Math.max(1, Math.ceil(Math.max(0, decision.retryAfterMs) / 1000));
    }

    clear(): void {
        this.windows.clear();
    }

    dispose(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.windows.clear();
    }

    private rejectionDecision(key: string, reason: GatewayRateLimitReason, retryAfterMs: number, now: number): GatewayRateLimitDecision {
        const entry = this.windows.get(key);
        void now;
        return {
            allowed: false,
            count: entry?.count ?? 0,
            resetAt: entry ? entry.windowStart + (this.policy.windowMs ?? DEFAULT_WINDOW_MS) : Date.now(),
            retryAfterMs,
            reason,
            message: this.rejectionMessage(reason)
        };
    }

    private rejectionMessage(reason: GatewayRateLimitReason): string {
        if (reason === 'quota') {
            return this.policy.quota?.message ?? this.policy.message ?? 'Request quota exceeded';
        }
        if (reason === 'throttle') {
            return this.policy.throttle?.message ?? this.policy.message ?? 'Too many requests';
        }
        return this.policy.message ?? 'Too many requests';
    }

    private longestWindowMs(): number {
        return Math.max(
            this.policy.windowMs ?? DEFAULT_WINDOW_MS,
            this.policy.quota?.windowMs ?? DEFAULT_WINDOW_MS,
            this.policy.throttle?.minIntervalMs ?? DEFAULT_WINDOW_MS
        );
    }

    private ensureEntry(key: string, now: number): WindowEntry {
        let entry = this.windows.get(key);
        if (!entry) {
            if (this.windows.size >= this.maxKeys) {
                const oldest = this.windows.keys().next().value;
                if (oldest !== undefined) {
                    this.windows.delete(oldest);
                }
            }
            entry = { count: 0, windowStart: now, quotaCount: 0, quotaStart: now };
            this.windows.set(key, entry);
        }
        return entry;
    }

    private evict(): void {
        const now = Date.now();
        const windowMs = this.policy.windowMs ?? DEFAULT_WINDOW_MS;
        const quotaWindowMs = this.policy.quota?.windowMs ?? windowMs;
        for (const [key, entry] of this.windows) {
            const rateExpired = this.policy.limit == null || now - entry.windowStart >= windowMs;
            const quotaExpired = !this.policy.quota || now - entry.quotaStart >= quotaWindowMs;
            const throttleExpired = !this.policy.throttle || !entry.lastAt
                || now - entry.lastAt >= this.policy.throttle.minIntervalMs;
            if (rateExpired && quotaExpired && throttleExpired) {
                this.windows.delete(key);
            }
        }
    }
}
