import expect = require('expect');
import { Test } from '@tsdi/unit';
import { classifyModelError, isRetryableError, retryAfterMs, retryDelayMs } from '../src/model/RetryPolicy';

export class RetryPolicySpec {
    @Test('classifies model failures by status and error')
    classify() {
        expect(classifyModelError(429)).toBe('rate-limit');
        expect(classifyModelError(503)).toBe('server');
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
}
