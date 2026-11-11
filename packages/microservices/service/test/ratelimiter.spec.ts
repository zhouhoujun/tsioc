import expect = require('expect');
import { createInjector } from '@tsdi/ioc';
import { createRequestContext } from '@tsdi/common';
import { ApiRateLimiter } from '../src';

function input(ip: string) {
    return {
        getHeader: (name: string) => name.toLowerCase() === 'x-forwarded-for' ? ip : undefined
    };
}

describe('ApiRateLimiter', () => {
    it('enforces the configured limit within a window', () => {
        const limiter = new ApiRateLimiter({ limit: 1, windowMs: 60_000 });
        const context = createRequestContext(createInjector());
        expect(limiter.check(input('10.0.0.1'), context)).toBe(true);
        expect(limiter.check(input('10.0.0.1'), context)).toBe(false);
        limiter.destroy();
    });

    it('bounds the number of tracked client keys', () => {
        const limiter = new ApiRateLimiter({ limit: 10, windowMs: 60_000, maxKeys: 2 });
        const context = createRequestContext(createInjector());
        expect(limiter.check(input('1.1.1.1'), context)).toBe(true);
        expect(limiter.check(input('2.2.2.2'), context)).toBe(true);
        expect(limiter.check(input('3.3.3.3'), context)).toBe(true);
        expect((limiter as any).windows.size).toBeLessThanOrEqual(2);
        limiter.destroy();
    });

    it('enforces long-window quotas independently from rate limits', () => {
        const limiter = new ApiRateLimiter({
            limit: 100,
            windowMs: 60_000,
            quota: { limit: 2, windowMs: 60_000, message: 'quota exceeded' }
        });
        const context = createRequestContext(createInjector());
        expect(limiter.check(input('10.0.0.2'), context)).toBe(true);
        expect(limiter.check(input('10.0.0.2'), context)).toBe(true);
        expect(limiter.check(input('10.0.0.2'), context)).toBe(false);
        expect(limiter.rejection(input('10.0.0.2'), context).message).toBe('quota exceeded');
        limiter.destroy();
    });

    it('throttles accepted requests by minimum interval', async () => {
        const limiter = new ApiRateLimiter({
            throttle: { minIntervalMs: 30, message: 'slow down' }
        });
        const context = createRequestContext(createInjector());
        expect(limiter.check(input('10.0.0.3'), context)).toBe(true);
        expect(limiter.check(input('10.0.0.3'), context)).toBe(false);
        expect(limiter.rejection(input('10.0.0.3'), context).message).toBe('slow down');
        await new Promise(resolve => setTimeout(resolve, 40));
        expect(limiter.check(input('10.0.0.3'), context)).toBe(true);
        limiter.destroy();
    });

    it('does not keep the process alive after destroy', () => {
        const limiter = new ApiRateLimiter({ limit: 10, windowMs: 60_000 });
        limiter.destroy();
        expect((limiter as any).cleanupTimer).toBe(null);
    });
});
