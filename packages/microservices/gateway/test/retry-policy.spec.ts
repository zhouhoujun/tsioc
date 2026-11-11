import expect = require('expect');
import { resolveRetryBackoff } from '../src/retry-policy';

describe('gateway retry policy', () => {
    it('disables backoff by default', () => {
        expect(resolveRetryBackoff(undefined, 0)).toBe(0);
        expect(resolveRetryBackoff({}, 2)).toBe(0);
    });

    it('uses exponential backoff with a cap', () => {
        const options = { retryBackoffMs: 100, retryBackoffMaxMs: 250, retryJitter: false };
        expect(resolveRetryBackoff(options, 0)).toBe(100);
        expect(resolveRetryBackoff(options, 1)).toBe(200);
        expect(resolveRetryBackoff(options, 2)).toBe(250);
        expect(resolveRetryBackoff(options, 5)).toBe(250);
    });

    it('applies jitter within the configured range', () => {
        const options = { retryBackoffMs: 100, retryBackoffMaxMs: 1000 };
        for (let i = 0; i < 20; i++) {
            const delay = resolveRetryBackoff(options, 0);
            expect(delay).toBeGreaterThanOrEqual(50);
            expect(delay).toBeLessThanOrEqual(100);
        }
    });
});
