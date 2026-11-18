/** Fixed-window rate limiting with an optional shared store (multi-replica). */

export interface GatewayRateLimitPolicy {
    /** Maximum requests per window. */
    limit: number;
    /** Window length in milliseconds. */
    windowMs: number;
}

export interface GatewayRateLimitDecision {
    allowed: boolean;
    count: number;
    resetAt: number;
    retryAfterMs: number;
}

export interface GatewayRateLimitStore {
    increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

interface WindowEntry {
    count: number;
    windowStart: number;
}

/**
 * In-memory fixed-window limiter. The agent gateway used a hand-rolled copy;
 * both gateways now share this implementation (a store makes it replica-safe).
 */
export class GatewayRateLimiter {
    private readonly windows = new Map<string, WindowEntry>();
    private readonly maxKeys: number;
    private cleanupTimer?: ReturnType<typeof setInterval>;

    constructor(
        readonly policy: GatewayRateLimitPolicy,
        private readonly options: { store?: GatewayRateLimitStore; maxKeys?: number } = {}
    ) {
        this.maxKeys = Math.max(1, options.maxKeys ?? 10000);
        const windowMs = Math.max(1, policy.windowMs || 60000);
        this.cleanupTimer = setInterval(() => this.evict(windowMs), windowMs);
        (this.cleanupTimer as any)?.unref?.();
    }

    /** Memory-only check (sync); used by the agent gateway. */
    check(key: string): GatewayRateLimitDecision {
        const windowMs = Math.max(1, this.policy.windowMs || 60000);
        const limit = Math.max(1, this.policy.limit || 1);
        const now = Date.now();
        let entry = this.windows.get(key);
        if (!entry || now - entry.windowStart >= windowMs) {
            entry = { count: 0, windowStart: now };
            this.windows.set(key, entry);
            this.enforceCapacity();
        }
        entry.count += 1;
        const resetAt = entry.windowStart + windowMs;
        const allowed = entry.count <= limit;
        return {
            allowed,
            count: entry.count,
            resetAt,
            retryAfterMs: allowed ? 0 : Math.max(0, resetAt - now)
        };
    }

    /** Shared-store check when configured, memory fallback otherwise. */
    async checkShared(key: string): Promise<GatewayRateLimitDecision> {
        if (!this.options.store) {
            return this.check(key);
        }
        const windowMs = Math.max(1, this.policy.windowMs || 60000);
        const limit = Math.max(1, this.policy.limit || 1);
        const decision = await this.options.store.increment(key, windowMs);
        const allowed = decision.count <= limit;
        return {
            allowed,
            count: decision.count,
            resetAt: decision.resetAt,
            retryAfterMs: allowed ? 0 : Math.max(0, decision.resetAt - Date.now())
        };
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

    private evict(windowMs: number): void {
        const now = Date.now();
        for (const [key, entry] of this.windows) {
            if (now - entry.windowStart >= windowMs) {
                this.windows.delete(key);
            }
        }
    }

    private enforceCapacity(): void {
        if (this.windows.size <= this.maxKeys) {
            return;
        }
        const overflow = this.windows.size - this.maxKeys;
        let removed = 0;
        for (const key of this.windows.keys()) {
            this.windows.delete(key);
            if (++removed >= overflow) {
                break;
            }
        }
    }
}
