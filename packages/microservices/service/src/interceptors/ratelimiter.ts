import { RequestContext } from '@tsdi/common';
import { ApiRateLimitOptions } from '../options';

interface WindowEntry {
    count: number;
    windowStart: number;
    quotaCount: number;
    quotaStart: number;
    lastAt?: number;
}

export interface ApiRateLimitRejection {
    message: string;
    retryAfterMs: number;
}

/**
 * Fixed-window rate limiter for API routes.
 *
 * Supports three independent dimensions:
 * - `limit` / `windowMs`: short-window rate limit.
 * - `quota`: long-window request quota (e.g. daily/monthly caps).
 * - `throttle`: minimum interval between accepted requests.
 *
 * @publicApi
 */
export class ApiRateLimiter {
    private windows = new Map<string, WindowEntry>();

    private cleanupTimer: any;
    private readonly maxKeys: number;

    constructor(
        private options: ApiRateLimitOptions
    ) {
        this.maxKeys = Math.max(options.maxKeys ?? 10000, 1);
        const windowMs = Math.max(options.windowMs ?? 60000, options.quota?.windowMs ?? 60000, options.throttle?.minIntervalMs ?? 60000);
        this.cleanupTimer = setInterval(() => this.evictExpired(), windowMs);
        // The cleanup timer must not keep a process alive on its own.
        if (typeof (this.cleanupTimer as any).unref === 'function') {
            (this.cleanupTimer as any).unref();
        }
    }

    /**
     * Check if a request is allowed.
     * Returns true only when every configured dimension allows it.
     */
    check(input: any, context: RequestContext): boolean {
        const key = this.resolveKey(input, context);
        const now = Date.now();
        const entry = this.ensureEntry(key, now);
        const windowMs = this.options.windowMs ?? 60000;
        const limit = this.options.limit;
        const quota = this.options.quota;
        const throttle = this.options.throttle;

        if (limit != null) {
            if (now - entry.windowStart >= windowMs) {
                entry.windowStart = now;
                entry.count = 0;
            }
            if (entry.count >= limit) {
                return false;
            }
        }

        if (quota) {
            if (!entry.quotaStart || now - entry.quotaStart >= quota.windowMs) {
                entry.quotaStart = now;
                entry.quotaCount = 0;
            }
            if (entry.quotaCount >= quota.limit) {
                return false;
            }
        }

        if (throttle && entry.lastAt && now - entry.lastAt < throttle.minIntervalMs) {
            return false;
        }

        if (limit != null) {
            entry.count++;
        }
        if (quota) {
            entry.quotaCount++;
        }
        if (throttle) {
            entry.lastAt = now;
        }
        return true;
    }

    /**
     * Get remaining capacity in the shortest active window.
     */
    remaining(input: any, context: RequestContext): number {
        const key = this.resolveKey(input, context);
        const now = Date.now();
        const entry = this.windows.get(key);
        if (!entry) {
            return this.options.limit ?? this.options.quota?.limit ?? 0;
        }
        const windowMs = this.options.windowMs ?? 60000;
        let remaining: number | undefined;
        if (this.options.limit != null) {
            remaining = now - entry.windowStart >= windowMs
                ? this.options.limit
                : Math.max(0, this.options.limit - entry.count);
        }
        if (this.options.quota) {
            const quotaRemaining = now - entry.quotaStart >= this.options.quota.windowMs
                ? this.options.quota.limit
                : Math.max(0, this.options.quota.limit - entry.quotaCount);
            remaining = remaining == null ? quotaRemaining : Math.min(remaining, quotaRemaining);
        }
        return remaining ?? 0;
    }

    /**
     * Describe why the last `check()` rejected the request.
     */
    rejection(input: any, context: RequestContext): ApiRateLimitRejection {
        const key = this.resolveKey(input, context);
        const now = Date.now();
        const entry = this.windows.get(key);
        const windowMs = this.options.windowMs ?? 60000;
        const limit = this.options.limit;
        const quota = this.options.quota;
        const throttle = this.options.throttle;

        if (throttle && entry?.lastAt) {
            const wait = throttle.minIntervalMs - (now - entry.lastAt);
            if (wait > 0) {
                return {
                    message: throttle.message ?? this.options.message ?? 'Too many requests',
                    retryAfterMs: wait
                };
            }
        }
        if (quota && entry && entry.quotaCount >= quota.limit) {
            return {
                message: quota.message ?? this.options.message ?? 'Request quota exceeded',
                retryAfterMs: Math.max(0, entry.quotaStart + quota.windowMs - now)
            };
        }
        if (limit != null && entry) {
            return {
                message: this.options.message ?? 'Too many requests',
                retryAfterMs: Math.max(0, entry.windowStart + windowMs - now)
            };
        }
        return {
            message: this.options.message ?? 'Too many requests',
            retryAfterMs: windowMs
        };
    }

    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.windows.clear();
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
            entry = {
                count: 0,
                windowStart: now,
                quotaCount: 0,
                quotaStart: now
            };
            this.windows.set(key, entry);
        }
        return entry;
    }

    private resolveKey(input: any, context: RequestContext): string {
        if (this.options.key) {
            return this.options.key(input, context);
        }
        // Default: try x-forwarded-for, then remote address, then fallback to 'global'
        const incoming = input as any;
        const forwarded = incoming?.getHeader?.('x-forwarded-for') ?? incoming?.headers?.['x-forwarded-for'];
        if (forwarded) {
            return String(forwarded).split(',')[0].trim();
        }
        const remoteAddr = incoming?.rawRequest?.socket?.remoteAddress
            ?? incoming?.socket?.remoteAddress
            ?? context?.get?.('remoteAddress');
        if (remoteAddr) {
            return String(remoteAddr);
        }
        return 'global';
    }

    private evictExpired(): void {
        const now = Date.now();
        const windowMs = this.options.windowMs ?? 60000;
        const quotaWindowMs = this.options.quota?.windowMs ?? windowMs;
        for (const [key, entry] of this.windows) {
            const rateExpired = this.options.limit == null || now - entry.windowStart >= windowMs;
            const quotaExpired = !this.options.quota || now - entry.quotaStart >= quotaWindowMs;
            const throttleExpired = !this.options.throttle || !entry.lastAt || now - entry.lastAt >= this.options.throttle.minIntervalMs;
            if (rateExpired && quotaExpired && throttleExpired) {
                this.windows.delete(key);
            }
        }
    }
}
