import { RequestContext } from '@tsdi/common';
import { ApiRateLimitOptions } from '../options';

interface WindowEntry {
    count: number;
    windowStart: number;
}

/**
 * Fixed-window rate limiter for API routes.
 *
 * @publicApi
 */
export class ApiRateLimiter {
    private windows = new Map<string, WindowEntry>();

    private cleanupTimer: any;

    constructor(
        private options: ApiRateLimitOptions
    ) {
        const windowMs = options.windowMs ?? 60000;
        // Periodic cleanup of expired windows
        this.cleanupTimer = setInterval(() => this.evictExpired(), windowMs);
    }

    /**
     * Check if a request is allowed within the rate limit window.
     * Returns true if allowed, false if rate limited.
     */
    check(input: any, context: RequestContext): boolean {
        const key = this.resolveKey(input, context);
        const limit = this.options.limit;
        const windowMs = this.options.windowMs ?? 60000;
        const now = Date.now();

        let entry = this.windows.get(key);
        if (!entry || now - entry.windowStart >= windowMs) {
            entry = { count: 0, windowStart: now };
            this.windows.set(key, entry);
        }

        entry.count++;
        return entry.count <= limit;
    }

    /**
     * Get the remaining capacity for the current window.
     */
    remaining(input: any, context: RequestContext): number {
        const key = this.resolveKey(input, context);
        const limit = this.options.limit;
        const windowMs = this.options.windowMs ?? 60000;
        const now = Date.now();

        let entry = this.windows.get(key);
        if (!entry || now - entry.windowStart >= windowMs) {
            return limit;
        }
        return Math.max(0, limit - entry.count);
    }

    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.windows.clear();
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
        const windowMs = this.options.windowMs ?? 60000;
        const now = Date.now();
        for (const [key, entry] of this.windows) {
            if (now - entry.windowStart >= windowMs) {
                this.windows.delete(key);
            }
        }
    }
}
