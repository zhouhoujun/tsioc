import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { classifyModelError, DEFAULT_RETRY_POLICY, isRetryableError, retryAfterMs, retryDelayMs } from '../src/model/RetryPolicy';

@Suite('Model retry policy')
export class RetryPolicySpec {
    @Test('classifies model failures by status and error')
    classify() {
        expect(classifyModelError(429)).toBe('rate-limit');
        expect(classifyModelError(503)).toBe('server');
        expect(classifyModelError(400, new Error('invalid request'))).toBe('unknown');
        expect(classifyModelError(undefined, new Error('fetch failed'))).toBe('network');
        expect(classifyModelError(undefined, new Error('request timeout'))).toBe('timeout');
    }

    @Test('classifies capacity errors from status 529 and body signals')
    classifyCapacity() {
        expect(classifyModelError(529)).toBe('capacity');
        expect(classifyModelError(undefined, new Error('model is overloaded'))).toBe('capacity');
        expect(classifyModelError(undefined, new Error('overloaded'))).toBe('capacity');
        expect(classifyModelError(undefined, new Error('insufficient_quota'))).toBe('capacity');
        expect(classifyModelError(undefined, new Error('insufficient quota'))).toBe('capacity');
        expect(classifyModelError(200, new Error('capacity'))).toBe('capacity');
    }

    @Test('classifies network error variants including snake_case and kebab-case')
    classifyNetworkVariants() {
        expect(classifyModelError(undefined, new Error('network_error'))).toBe('network');
        expect(classifyModelError(undefined, new Error('network-error'))).toBe('network');
        expect(classifyModelError(undefined, new Error('ECONNREFUSED'))).toBe('network');
        expect(classifyModelError(undefined, new Error('ECONNRESET'))).toBe('network');
        expect(classifyModelError(undefined, new Error('ENOTFOUND'))).toBe('network');
        expect(classifyModelError(undefined, new Error('socket hang up'))).toBe('network');
    }

    @Test('isRetryableError returns true for retryable kinds')
    retryableKinds() {
        expect(isRetryableError('rate-limit')).toBe(true);
        expect(isRetryableError('capacity')).toBe(true);
        expect(isRetryableError('server')).toBe(true);
        expect(isRetryableError('network')).toBe(true);
        expect(isRetryableError('timeout')).toBe(true);
        expect(isRetryableError('unknown')).toBe(false);
    }

    @Test('parses retry-after seconds and caps delays')
    retryAfter() {
        expect(retryAfterMs('2')).toBe(2000);
        expect(retryDelayMs(1, '30')).toBe(15000);
    }

    @Test('honors a custom retry policy backoff parameters')
    customPolicy() {
        const policy = { maxRetries: 5, baseDelayMs: 250, maxDelayMs: 4000, jitterMs: 0 };
        expect(retryDelayMs(1, null, policy)).toBe(250);
        expect(retryDelayMs(2, null, policy)).toBe(500);
        expect(retryDelayMs(5, null, policy)).toBe(4000);
        expect(retryDelayMs(10, null, policy)).toBe(4000);
        expect(retryDelayMs(1, '2', policy)).toBe(2000);
    }

    @Test('default retry policy matches the legacy hardcoded adapter constants')
    defaultPolicy() {
        expect(DEFAULT_RETRY_POLICY).toEqual({ maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 15000, jitterMs: 500 });
        const noJitter = { ...DEFAULT_RETRY_POLICY, jitterMs: 0 };
        expect(retryDelayMs(1, null, noJitter)).toBe(1000);
        expect(retryDelayMs(2, null, noJitter)).toBe(2000);
        expect(retryDelayMs(5, null, noJitter)).toBe(15000);
    }
}
