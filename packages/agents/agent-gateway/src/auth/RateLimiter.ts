import { Inject, Injectable } from '@tsdi/ioc';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';

interface WindowEntry {
    count: number;
    windowStart: number;
}

/**
 * Per-IP sliding window rate limiter.
 * Mirrors zeroclaw-gateway's SlidingWindowRateLimiter.
 */
@Injectable()
export class RateLimiter {
    private windows = new Map<string, WindowEntry>();

    constructor(
        @Inject(GATEWAY_CONFIG, { nullable: true }) private config: GatewayConfig = defaultGatewayConfig
    ) {
        setInterval(() => this.evictExpired(), this.config.rateLimitWindowMs ?? 60_000).unref();
    }

    /** Check if a request from the given IP is within rate limits */
    check(ip: string): boolean {
        const max = this.config.rateLimitMax ?? 100;
        const windowMs = this.config.rateLimitWindowMs ?? 60_000;
        const now = Date.now();

        let entry = this.windows.get(ip);
        if (!entry || now - entry.windowStart >= windowMs) {
            entry = { count: 0, windowStart: now };
            this.windows.set(ip, entry);
        }

        entry.count++;
        return entry.count <= max;
    }

    /** Check and respond with 429 if over limit */
    checkAndRespond(ip: string, res: import('http').ServerResponse): boolean {
        if (!this.check(ip)) {
            res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' })
                .end(JSON.stringify({ error: 'rate limit exceeded' }));
            return false;
        }
        return true;
    }

    private evictExpired(): void {
        const windowMs = this.config.rateLimitWindowMs ?? 60_000;
        const now = Date.now();
        for (const [ip, entry] of this.windows) {
            if (now - entry.windowStart >= windowMs) {
                this.windows.delete(ip);
            }
        }
    }
}
