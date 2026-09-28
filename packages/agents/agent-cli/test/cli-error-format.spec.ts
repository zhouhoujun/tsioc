import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ModelRequestError } from '@tsdi/agent';
import { formatCliError } from '../src/cli-error-format';

function quotaError(): ModelRequestError {
    return new ModelRequestError({
        kind: 'quota',
        status: 402,
        provider: 'deepseek',
        model: 'deepseek-flash',
        detail: 'Insufficient Balance',
        retryable: false,
        requestId: 'req-402'
    });
}

@Suite('formatCliError')
export class FormatCliErrorTest {

    @Test('renders actionable text instead of a stack for a model quota failure')
    quotaIsActionable() {
        const text = formatCliError(quotaError());
        expect(text).toContain('insufficient balance');
        expect(text).toContain('402');
        expect(text).toContain('deepseek-flash');
        expect(text).toContain('req-402');
        expect(text).not.toContain('    at ');
    }

    @Test('keeps the stack out of the default output for every model failure kind')
    noStackForAnyModelKind() {
        for (const kind of ['quota', 'auth', 'rate-limit', 'capacity', 'server', 'network', 'timeout', 'unknown'] as const) {
            const text = formatCliError(new ModelRequestError({
                kind, status: 500, provider: 'deepseek', model: 'deepseek-flash', retryable: true
            }));
            expect(text).not.toContain('    at ');
        }
    }

    @Test('includes the stack for model failures only in debug mode')
    debugAppendsStack() {
        const error = quotaError();
        const text = formatCliError(error, { debug: true });
        expect(text).toContain('insufficient balance');
        expect(text).toContain('    at ');
    }

    @Test('preserves the previous stack-first behavior for non-model errors')
    nonModelErrorsUnchanged() {
        const error = new TypeError('boom');
        expect(formatCliError(error)).toBe(error.stack || error.message);
        expect(formatCliError('plain failure')).toBe('plain failure');
        expect(formatCliError(undefined)).toBe('undefined');
    }

    @Test('works for a plain provider Error carrying an attached model failure')
    duckTypedFailure() {
        const error = Object.assign(new Error('Model request failed with 402: Insufficient Balance'), {
            modelFailure: { kind: 'quota', status: 402, provider: 'deepseek', model: 'deepseek-flash', retryable: false }
        });
        const text = formatCliError(error);
        expect(text).toContain('insufficient balance');
        expect(text).not.toContain('    at ');
    }
}
