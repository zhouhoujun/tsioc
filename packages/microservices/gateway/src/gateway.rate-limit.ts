import { RequestContext } from '@tsdi/common';
import { GatewayRateLimiter as SharedRateLimiter } from '@tsdi/gateway-kit';
import { GatewayOptions, ResolvedGatewayRoute } from './gateway.options';
import { GatewayRuntime } from './gateway.runtime';
import { getClientIp } from './gateway.http';

export function rateLimitError(retryAfterMs: number, message = 'Rate limit exceeded'): Error {
    return Object.assign(new Error(message), {
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        headers: { 'Retry-After': String(Math.max(1, Math.ceil(Math.max(0, retryAfterMs) / 1000))) }
    });
}

/**
 * Route and global rate limiting, including the shared state-store window
 * used by multi-replica gateways.
 *
 * Extracted from `GatewayInterceptor` so the interceptor only orchestrates.
 */
export class GatewayRateLimiter {
    private limiters = new Map<string, SharedRateLimiter>();
    private globalLimiter?: SharedRateLimiter;

    constructor(
        private readonly options: GatewayOptions,
        private readonly runtime: GatewayRuntime
    ) { }

    async applyRoute(route: ResolvedGatewayRoute, input: any, context: RequestContext): Promise<void> {
        const defaultRateLimit = this.runtime.getOption('rateLimit', this.options.rateLimit);
        const rateLimit = route.rateLimit === false ? false : (route.rateLimit ?? defaultRateLimit);
        if (!rateLimit) {
            return;
        }
        if (this.useSharedRateLimit(rateLimit)) {
            const decision = await this.runtime.incrementRateLimit(
                `${route.path}:${getClientIp(input)}`,
                rateLimit.windowMs!
            );
            if (decision && decision.count > rateLimit.limit!) {
                throw rateLimitError(decision.resetAt - Date.now());
            }
            return;
        }
        let limiter = this.limiters.get(route.path);
        if (!limiter) {
            limiter = new SharedRateLimiter(rateLimit);
            this.limiters.set(route.path, limiter);
        }
        const key = getClientIp(input) || 'global';
        if (!limiter.check(key).allowed) {
            const rejection = limiter.rejection(key);
            throw rateLimitError(rejection.retryAfterMs, rejection.message);
        }
    }

    async applyGlobal(input: any, context: RequestContext): Promise<void> {
        const rateLimit = this.runtime.getOption('globalRateLimit', this.options.globalRateLimit);
        if (!rateLimit) {
            return;
        }
        if (this.useSharedRateLimit(rateLimit)) {
            const decision = await this.runtime.incrementRateLimit(
                `global:${getClientIp(input)}`,
                rateLimit.windowMs!
            );
            if (decision && decision.count > rateLimit.limit!) {
                throw rateLimitError(decision.resetAt - Date.now());
            }
            return;
        }
        if (!this.globalLimiter) {
            this.globalLimiter = new SharedRateLimiter(rateLimit);
        }
        const key = getClientIp(input) || 'global';
        if (!this.globalLimiter.check(key).allowed) {
            const rejection = this.globalLimiter.rejection(key);
            throw rateLimitError(rejection.retryAfterMs, rejection.message);
        }
    }

    destroy(): void {
        this.globalLimiter?.dispose();
        this.globalLimiter = undefined;
        for (const limiter of Array.from(this.limiters.values())) {
            limiter.dispose();
        }
        this.limiters.clear();
    }

    private useSharedRateLimit(options: any): boolean {
        return this.runtime.hasSharedState()
            && typeof options === 'object'
            && Number.isFinite(options.limit)
            && Number.isFinite(options.windowMs)
            && !options.quota
            && !options.throttle;
    }
}
