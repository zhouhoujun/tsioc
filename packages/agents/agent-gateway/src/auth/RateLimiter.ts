import { Inject, Injectable } from '@tsdi/ioc';
import { GatewayRateLimiter, sendGatewayError } from '@tsdi/gateway-kit';
import { GATEWAY_CONFIG } from '../tokens';
import { GatewayConfig, defaultGatewayConfig } from '../contracts/GatewayConfig';

/**
 * Per-IP rate limiter for the agent gateway.
 *
 * The window/decision logic lives in `@tsdi/gateway-kit` so both gateways share
 * one implementation; a shared store can be supplied for multi-replica setups.
 */
@Injectable()
export class RateLimiter {
    private limiter?: GatewayRateLimiter;
    private limit = 0;
    private windowMs = 0;

    constructor(
        @Inject(GATEWAY_CONFIG, { nullable: true }) private config: GatewayConfig = defaultGatewayConfig
    ) {}

    /** Check if a request from the given IP is within rate limits. */
    check(ip: string): boolean {
        return this.ensureLimiter().check(ip).allowed;
    }

    /** Check and respond with 429 if over the limit. */
    checkAndRespond(ip: string, res: import('http').ServerResponse): boolean {
        const limiter = this.ensureLimiter();
        const decision = limiter.check(ip);
        if (decision.allowed) {
            return true;
        }
        sendGatewayError(res, 429, 'rate limit exceeded', {
            headers: { 'Retry-After': String(limiter.retryAfterSeconds(decision)) }
        });
        return false;
    }

    dispose(): void {
        this.limiter?.dispose();
        this.limiter = undefined;
    }

    /**
     * Build (or rebuild) the shared limiter from the current config. Hosts may
     * replace the injected config after construction (tests and runtime
     * settings), so the policy is re-read instead of captured once.
     */
    private ensureLimiter(): GatewayRateLimiter {
        const limit = this.config.rateLimitMax ?? 100;
        const windowMs = this.config.rateLimitWindowMs ?? 60_000;
        if (!this.limiter || this.limit !== limit || this.windowMs !== windowMs) {
            this.limiter?.dispose();
            this.limiter = new GatewayRateLimiter({ limit, windowMs });
            this.limit = limit;
            this.windowMs = windowMs;
        }
        return this.limiter;
    }
}
