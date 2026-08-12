import expect = require('expect');
import { Test } from '@tsdi/unit';
import { classifyModelError, retryAfterMs, retryDelayMs } from '../src/model/RetryPolicy';

export class RetryPolicySpec {
    @Test('classifies model failures by status and error')
    classify() {
        expect(classifyModelError(429)).toBe('rate-limit');
        expect(classifyModelError(503)).toBe('server');
        expect(classifyModelError(undefined, new Error('fetch failed'))).toBe('network');
        expect(classifyModelError(undefined, new Error('request timeout'))).toBe('timeout');
    }

    @Test('parses retry-after seconds and caps delays')
    retryAfter() {
        expect(retryAfterMs('2')).toBe(2000);
        expect(retryDelayMs(1, '30')).toBe(15000);
    }
}
