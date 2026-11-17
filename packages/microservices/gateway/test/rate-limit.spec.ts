import expect = require('expect');
import { GatewayRateLimiter, rateLimitError } from '../src/gateway.rate-limit';
import { GatewayRuntime } from '../src/gateway.runtime';

describe('GatewayRateLimiter', () => {
    function createRequest(ip = '10.0.0.1') {
        return {
            url: '/api/users',
            method: 'GET',
            headers: {},
            getHeader() { return undefined; },
            socket: { remoteAddress: ip }
        } as any;
    }

    const route = { path: '/api/users', service: 'users-service' } as any;
    const context = {} as any;

    it('enforces route-level windows and exposes retry-after', async () => {
        const limiter = new GatewayRateLimiter({
            rateLimit: { limit: 2, windowMs: 60_000 }
        }, new GatewayRuntime());

        await limiter.applyRoute(route, createRequest(), context);
        await limiter.applyRoute(route, createRequest(), context);
        let error: any;
        try {
            await limiter.applyRoute(route, createRequest(), context);
        } catch (err) {
            error = err;
        }
        expect(error.statusCode).toBe(429);
        expect(error.statusMessage).toBe('Too Many Requests');
        expect(error.headers['Retry-After']).toBe('60');

        // other routes keep their own window
        await limiter.applyRoute({ ...route, path: '/api/orders' }, createRequest(), context);
        limiter.destroy();
    });

    it('skips disabled route limits but keeps global limits', async () => {
        const limiter = new GatewayRateLimiter({
            rateLimit: { limit: 1, windowMs: 60_000 },
            globalRateLimit: { limit: 1, windowMs: 60_000 }
        }, new GatewayRuntime());

        await limiter.applyRoute({ ...route, rateLimit: false }, createRequest(), context);
        await limiter.applyRoute({ ...route, rateLimit: false }, createRequest(), context);

        await limiter.applyGlobal(createRequest(), context);
        await expect(limiter.applyGlobal(createRequest(), context))
            .rejects.toMatchObject({ statusCode: 429 });
        limiter.destroy();
    });

    it('uses the shared state store for multi-replica windows', async () => {
        const keys: string[] = [];
        const runtime = {
            getOption: (_key: string, fallback: any) => fallback,
            hasSharedState: () => true,
            incrementRateLimit: async (key: string) => {
                keys.push(key);
                return { count: 2, resetAt: Date.now() + 1_500 };
            }
        } as any;
        const limiter = new GatewayRateLimiter({
            rateLimit: { limit: 1, windowMs: 60_000 },
            globalRateLimit: { limit: 1, windowMs: 60_000 }
        }, runtime);

        await expect(limiter.applyRoute(route, createRequest('10.0.0.7'), context))
            .rejects.toMatchObject({ statusCode: 429 });
        await expect(limiter.applyGlobal(createRequest('10.0.0.7'), context))
            .rejects.toMatchObject({ statusCode: 429 });
        expect(keys).toEqual(['/api/users:10.0.0.7', 'global:10.0.0.7']);
        limiter.destroy();
    });

    it('does not use shared state for quota or throttle rules', async () => {
        let sharedCalls = 0;
        const runtime = {
            getOption: (_key: string, fallback: any) => fallback,
            hasSharedState: () => true,
            incrementRateLimit: async () => {
                sharedCalls += 1;
                return { count: 1, resetAt: Date.now() + 1_000 };
            }
        } as any;
        const limiter = new GatewayRateLimiter({
            rateLimit: { limit: 5, windowMs: 60_000, quota: { limit: 100, windowMs: 60_000 } }
        }, runtime);

        await limiter.applyRoute(route, createRequest('10.0.0.8'), context);
        expect(sharedCalls).toBe(0);
        limiter.destroy();
    });

    it('recreates local windows after destroy', async () => {
        const limiter = new GatewayRateLimiter({
            rateLimit: { limit: 1, windowMs: 60_000 }
        }, new GatewayRuntime());

        await limiter.applyRoute(route, createRequest('10.0.0.9'), context);
        await expect(limiter.applyRoute(route, createRequest('10.0.0.9'), context))
            .rejects.toMatchObject({ statusCode: 429 });
        limiter.destroy();
        await limiter.applyRoute(route, createRequest('10.0.0.9'), context);
        limiter.destroy();
    });

    it('builds rate limit errors with a minimum one second retry-after', () => {
        expect(rateLimitError(0).headers['Retry-After']).toBe('1');
        expect(rateLimitError(2_100).headers['Retry-After']).toBe('3');
        expect(rateLimitError(500, 'slow down').message).toBe('slow down');
    });
});
